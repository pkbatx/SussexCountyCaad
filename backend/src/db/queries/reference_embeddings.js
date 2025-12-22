function upsertReferenceEmbedding(db, { referenceId, model, embedding }) {
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO reference_embeddings (reference_id, model, embedding_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(reference_id, model) DO UPDATE SET embedding_json = excluded.embedding_json, updated_at = excluded.updated_at"
  ).run(referenceId, model, JSON.stringify(embedding), now, now);
}

function listReferenceEmbeddings(db, { referenceIds, model }) {
  if (!Array.isArray(referenceIds) || referenceIds.length === 0) {
    return new Map();
  }
  const placeholders = referenceIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT reference_id, embedding_json FROM reference_embeddings WHERE model = ? AND reference_id IN (${placeholders})`
    )
    .all(model, ...referenceIds);
  const map = new Map();
  rows.forEach((row) => {
    try {
      map.set(row.reference_id, JSON.parse(row.embedding_json));
    } catch (_error) {
      map.set(row.reference_id, null);
    }
  });
  return map;
}

module.exports = {
  upsertReferenceEmbedding,
  listReferenceEmbeddings
};
