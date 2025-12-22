const { createAIAdapter } = require("../ai/adapter");
const {
  listReferenceEmbeddings,
  upsertReferenceEmbedding
} = require("../db/queries/reference_embeddings");

function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) {
    return null;
  }
  if (left.length !== right.length || left.length === 0) {
    return null;
  }
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let i = 0; i < left.length; i += 1) {
    const l = left[i];
    const r = right[i];
    dot += l * r;
    leftNorm += l * l;
    rightNorm += r * r;
  }
  if (!leftNorm || !rightNorm) {
    return null;
  }
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function trimText(text, limit = 1200) {
  if (!text) {
    return "";
  }
  const value = String(text);
  return value.length > limit ? value.slice(0, limit) : value;
}

async function ensureEmbeddingsForCandidates({ db, config, candidates }) {
  const model = config.openaiEmbeddingsModel;
  const adapter = createAIAdapter({ config });
  const missing = [];
  candidates.forEach((candidate) => {
    if (!candidate?.reference_id || !candidate?.canonical_name) {
      return;
    }
    if (!candidate.embedding) {
      missing.push(candidate);
    }
  });
  if (!missing.length) {
    return;
  }
  const inputs = missing.map((candidate) => candidate.canonical_name);
  const result = await adapter.embedTexts({ input: inputs, model });
  result.embeddings.forEach((embedding, index) => {
    const candidate = missing[index];
    if (!candidate || !embedding) {
      return;
    }
    candidate.embedding = embedding;
    upsertReferenceEmbedding(db, {
      referenceId: candidate.reference_id,
      model: result.model || model,
      embedding
    });
  });
}

function attachEmbeddings(candidates, embeddingsMap) {
  return candidates.map((candidate) => ({
    ...candidate,
    embedding: embeddingsMap.get(candidate.reference_id) || null
  }));
}

async function rerankReferenceCandidates({ db, config, text, candidates }) {
  if (!config.openaiApiKey || !config.openaiEmbeddingsModel) {
    return candidates;
  }
  if (!candidates || !text) {
    return candidates;
  }

  const referenceIds = [];
  Object.values(candidates).forEach((list) => {
    (list || []).forEach((item) => {
      if (item?.reference_id) {
        referenceIds.push(item.reference_id);
      }
    });
  });
  if (!referenceIds.length) {
    return candidates;
  }

  const embeddingsMap = listReferenceEmbeddings(db, {
    referenceIds,
    model: config.openaiEmbeddingsModel
  });
  const ranked = {};
  const adapter = createAIAdapter({ config });
  let queryEmbedding = null;

  try {
    const result = await adapter.embedTexts({
      input: trimText(text),
      model: config.openaiEmbeddingsModel
    });
    queryEmbedding = result.embeddings?.[0] || null;
  } catch (error) {
    console.warn(`[reference] query embedding failed: ${error.message}`);
    return candidates;
  }

  for (const [type, list] of Object.entries(candidates)) {
    if (!Array.isArray(list) || list.length === 0) {
      ranked[type] = list;
      continue;
    }
    const withEmbeddings = attachEmbeddings(list, embeddingsMap);
    await ensureEmbeddingsForCandidates({
      db,
      config,
      candidates: withEmbeddings
    });
    ranked[type] = withEmbeddings
      .map((item) => {
        const score = item.embedding
          ? cosineSimilarity(queryEmbedding, item.embedding)
          : null;
        return { item, score };
      })
      .sort((left, right) => {
        if (right.score === null && left.score === null) {
          return 0;
        }
        if (right.score === null) {
          return -1;
        }
        if (left.score === null) {
          return 1;
        }
        return right.score - left.score;
      })
      .map((entry) => entry.item);
  }

  return ranked;
}

module.exports = {
  rerankReferenceCandidates
};
