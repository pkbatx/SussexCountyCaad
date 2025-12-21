const fs = require("fs");
const path = require("path");
const { createAIAdapter } = require("../../ai/adapter");
const {
  parseJsonStrict,
  validatePayload,
  validateExtractionEvidence
} = require("../../ai/validate");
const { attemptRepair } = require("../../ai/repair");
const { listTranscriptsForCall } = require("../../db/queries/transcripts");
const { createMetadataExtract } = require("../../db/queries/metadata");
const { createAIInvocation } = require("../../db/queries/ai_invocations");
const { findReferenceCandidatesForText } = require("../../db/queries/reference_data");
const { listFeedbackSignals } = require("../../db/queries/feedback");
const { getCallById } = require("../../db/queries/calls");
const { extractFilenameHints } = require("../filename-hints");

const schemaPath = path.join(__dirname, "../../ai/schema/metadata.json");
const schemaText = fs.readFileSync(schemaPath, "utf8");
const extractionFields = [
  "incident_type",
  "priority",
  "jurisdiction",
  "channel",
  "talkgroup",
  "units",
  "incident_id",
  "address_raw",
  "address_normalized",
  "cross_street_1",
  "cross_street_2",
  "landmark",
  "city",
  "notes"
];

function summarizeConfidence(payload) {
  const scores = Object.values(payload.field_confidence || {}).filter(
    (value) => typeof value === "number"
  );
  if (!scores.length) {
    return null;
  }
  const total = scores.reduce((sum, value) => sum + value, 0);
  return total / scores.length;
}

function calculateFeedbackPenalty(signals, config) {
  if (!Array.isArray(signals) || signals.length === 0) {
    return 0;
  }
  const fallbackPenalty =
    typeof config.feedbackConfidencePenalty === "number"
      ? config.feedbackConfidencePenalty
      : 0;
  const fallbackMax =
    typeof config.feedbackMaxPenalty === "number" ? config.feedbackMaxPenalty : 0;
  let total = 0;

  signals.forEach((signal) => {
    const adjustment = signal.adjustment || {};
    const penalty =
      typeof adjustment.confidence_penalty === "number"
        ? adjustment.confidence_penalty
        : fallbackPenalty;
    const maxPenalty =
      typeof adjustment.max_penalty === "number"
        ? adjustment.max_penalty
        : fallbackMax;
    const applied = maxPenalty > 0 ? Math.min(maxPenalty, penalty) : penalty;
    if (typeof applied === "number" && applied > 0) {
      total += applied;
    }
  });

  if (fallbackMax > 0) {
    total = Math.min(fallbackMax, total);
  }
  return total;
}

function applyFeedbackAdjustments(payload, penalty) {
  if (!payload || !penalty || penalty <= 0) {
    return payload;
  }
  const adjusted = { ...payload };
  const baseline =
    typeof payload.confidence_overall === "number"
      ? payload.confidence_overall
      : summarizeConfidence(payload);
  if (typeof baseline === "number") {
    adjusted.confidence_overall = Math.max(0, baseline - penalty);
  }
  if (payload.field_confidence && typeof payload.field_confidence === "object") {
    adjusted.field_confidence = { ...payload.field_confidence };
    Object.keys(adjusted.field_confidence).forEach((field) => {
      const value = adjusted.field_confidence[field];
      if (typeof value === "number") {
        adjusted.field_confidence[field] = Math.max(0, value - penalty);
      }
    });
  }
  return adjusted;
}

function buildPrompt({
  transcriptText,
  callId,
  extractedAt,
  referenceCandidates,
  filenameMetadata
}) {
  return [
    "You output JSON only. No markdown. No extra keys.",
    "Schema version must be extraction.v2.",
    `Fields: ${extractionFields.join(", ")}`,
    "field_confidence must include a numeric 0-1 value for every field (use 0 for unknown).",
    "evidence must include an array for every field (empty array allowed for unknown).",
    "Every non-null field needs at least one evidence item with transcript spans.",
    "Focus on address, cross streets, jurisdiction, agency, and incident type.",
    "Prefer provided reference candidates for street/town/poi fields; if no candidate matches, set field to null.",
    "Do not treat ambiguous agency names as location unless the transcript explicitly ties them to a town.",
    "If uncertain, set the field to null or empty and use low confidence.",
    `call_id: ${callId}`,
    `extracted_at: ${extractedAt}`,
    `Schema: ${schemaText}`,
    "Evidence spans must use start_char/end_char indices into the transcript.",
    `Filename metadata: ${JSON.stringify(filenameMetadata || {})}`,
    `Reference candidates: ${JSON.stringify(referenceCandidates || {})}`,
    `Transcript: ${transcriptText}`
  ].join("\n");
}

function buildRepairPrompt({
  transcriptText,
  errors,
  raw,
  callId,
  extractedAt,
  referenceCandidates,
  filenameMetadata
}) {
  return [
    "The previous response failed schema validation.",
    `Errors: ${JSON.stringify(errors)}`,
    "Return JSON that matches the schema exactly with required fields.",
    "You output JSON only. No markdown. No extra keys.",
    `Fields: ${extractionFields.join(", ")}`,
    "field_confidence must include a numeric 0-1 value for every field (use 0 for unknown).",
    "evidence must include an array for every field (empty array allowed for unknown).",
    "Every non-null field needs at least one evidence item with transcript spans.",
    "Focus on address, cross streets, jurisdiction, agency, and incident type.",
    "Prefer provided reference candidates for street/town/poi fields; if no candidate matches, set field to null.",
    "Do not treat ambiguous agency names as location unless the transcript explicitly ties them to a town.",
    "If uncertain, set the field to null or empty and use low confidence.",
    `call_id: ${callId}`,
    `extracted_at: ${extractedAt}`,
    `Schema: ${schemaText}`,
    "Evidence spans must use start_char/end_char indices into the transcript.",
    `Filename metadata: ${JSON.stringify(filenameMetadata || {})}`,
    `Reference candidates: ${JSON.stringify(referenceCandidates || {})}`,
    `Transcript: ${transcriptText}`,
    `Previous response: ${raw}`
  ].join("\n");
}

function normalizeCandidate(value) {
  if (!value) {
    return "";
  }
  return String(value).toLowerCase().trim();
}

function candidateMatches(value, candidates) {
  if (!value || !Array.isArray(candidates) || !candidates.length) {
    return true;
  }
  const normalized = normalizeCandidate(value);
  return candidates.some((candidate) => {
    const options = [candidate.canonical_name, ...(candidate.aliases || [])]
      .map(normalizeCandidate)
      .filter(Boolean);
    return options.some(
      (option) =>
        normalized === option ||
        normalized.includes(option) ||
        option.includes(normalized)
    );
  });
}

function validateReferenceCandidates(payload, referenceCandidates) {
  if (!referenceCandidates) {
    return { ok: true, errors: [] };
  }

  const errors = [];
  const streetCandidates = referenceCandidates.street || [];
  const townCandidates = referenceCandidates.town || [];
  const poiCandidates = referenceCandidates.poi || [];

  const checks = [
    { field: "address_normalized", candidates: streetCandidates },
    { field: "cross_street_1", candidates: streetCandidates },
    { field: "cross_street_2", candidates: streetCandidates },
    { field: "landmark", candidates: poiCandidates },
    { field: "city", candidates: townCandidates },
    { field: "jurisdiction", candidates: townCandidates }
  ];

  checks.forEach(({ field, candidates }) => {
    const value = payload[field];
    if (value && !candidateMatches(value, candidates)) {
      errors.push({
        message: "Value not in reference candidates",
        field
      });
    }
  });

  return { ok: errors.length === 0, errors };
}

function mergeReferenceCandidates(primary, secondary, limitPerType) {
  const merged = {};
  const types = new Set([
    ...Object.keys(primary || {}),
    ...Object.keys(secondary || {})
  ]);

  types.forEach((type) => {
    const items = [];
    const seen = new Set();
    [primary?.[type] || [], secondary?.[type] || []].forEach((list) => {
      list.forEach((item) => {
        if (!item || seen.has(item.reference_id)) {
          return;
        }
        seen.add(item.reference_id);
        if (!limitPerType || items.length < limitPerType) {
          items.push(item);
        }
      });
    });
    merged[type] = items;
  });

  return merged;
}

function recordFailure({ db, callId, prompt, result, status, errors, setRecorded }) {
  if (setRecorded) {
    setRecorded();
  }
  createAIInvocation(db, {
    callId,
    stageName: "extraction",
    provider: "openai",
    model: result?.model ?? null,
    requestJson: { prompt },
    responseJson: {
      raw: result?.content ?? null,
      errors: errors ?? null
    },
    tokenUsage: result?.usage ?? null,
    latencyMs: result?.latencyMs ?? null,
    status
  });
}

async function runStage({ config, db, callId, runId, pipeline }) {
  const transcripts = listTranscriptsForCall(db, callId);
  if (!transcripts.length) {
    throw new Error("No transcript available for metadata extraction");
  }

  const call = getCallById(db, callId);
  const transcriptText = transcripts[0].text;
  const transcriptCandidates = findReferenceCandidatesForText(db, {
    text: transcriptText,
    limitPerType: config.referenceDataMaxCandidates
  });
  const filenameHints = extractFilenameHints({
    db,
    sourcePath: call?.source_path || null,
    config
  });
  const referenceCandidates = mergeReferenceCandidates(
    transcriptCandidates,
    filenameHints.referenceCandidates,
    config.referenceDataMaxCandidates
  );
  const extractedAt = new Date().toISOString();
  const prompt = buildPrompt({
    transcriptText,
    callId,
    extractedAt,
    referenceCandidates,
    filenameMetadata: {
      raw: filenameHints.raw,
      town_candidates: filenameHints.townCandidates,
      agency_tokens: filenameHints.agencyTokens,
      ambiguous_agencies: filenameHints.ambiguousAgencies
    }
  });
  const adapter = createAIAdapter({ config });
  const maxAttempts = 3;
  let payload = null;
  let lastErrors = [{ message: "validation_failed" }];
  let lastRaw = "";

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const currentPrompt =
          attempt === 0
        ? prompt
        : buildRepairPrompt({
            transcriptText,
            errors: lastErrors,
            raw: lastRaw,
            callId,
            extractedAt,
            referenceCandidates,
            filenameMetadata: {
              raw: filenameHints.raw,
              town_candidates: filenameHints.townCandidates,
              agency_tokens: filenameHints.agencyTokens,
              ambiguous_agencies: filenameHints.ambiguousAgencies
            }
          });

    const result = await adapter.extractMetadata({ prompt: currentPrompt });
    lastRaw = result.content || "";

    try {
      payload = parseJsonStrict(result.content);
    } catch (_error) {
      payload = attemptRepair(result.content);
    }

    if (!payload) {
      lastErrors = [{ message: "Invalid JSON" }];
      recordFailure({
        db,
        callId,
        prompt: currentPrompt,
        result,
        status: "invalid_json",
        errors: lastErrors
      });
      continue;
    }

    const validation = validatePayload(schemaPath, payload);
    const evidenceCheck = validateExtractionEvidence(payload);
    const referenceCheck = validateReferenceCandidates(payload, referenceCandidates);
    lastErrors = [
      ...(validation.errors || []),
      ...(evidenceCheck.errors || []).map((error) => ({
        message: error.message,
        field: error.field
      })),
      ...(referenceCheck.errors || []).map((error) => ({
        message: error.message,
        field: error.field
      }))
    ];

    if (!validation.ok || !evidenceCheck.ok || !referenceCheck.ok) {
      recordFailure({
        db,
        callId,
        prompt: currentPrompt,
        result,
        status: "failed",
        errors: lastErrors
      });
      continue;
    }

    const feedbackSignals = listFeedbackSignals(db, {
      callId,
      signalType: "contradiction"
    });
    const feedbackPenalty = calculateFeedbackPenalty(feedbackSignals, config);
    payload = applyFeedbackAdjustments(payload, feedbackPenalty);

    createAIInvocation(db, {
      callId,
      stageName: "extraction",
      provider: "openai",
      model: result.model,
      requestJson: { prompt: currentPrompt },
      responseJson: payload,
      tokenUsage: result.usage,
      latencyMs: result.latencyMs,
      status: "succeeded"
    });
    break;
  }

  if (!payload) {
    throw new Error("Invalid JSON from metadata extraction");
  }

  const finalValidation = validatePayload(schemaPath, payload);
  const finalEvidenceCheck = validateExtractionEvidence(payload);
  const finalReferenceCheck = validateReferenceCandidates(payload, referenceCandidates);
  if (!finalValidation.ok || !finalEvidenceCheck.ok || !finalReferenceCheck.ok) {
    throw new Error("Metadata extraction schema validation failed");
  }

  createMetadataExtract(db, {
    callId,
    runId,
    schemaVersion: "extraction.v2",
    payloadJson: payload,
    confidenceSummary: payload.confidence_overall ?? summarizeConfidence(payload)
  });

  if (pipeline?.enqueue) {
    pipeline.enqueue(callId, "grouping");
    pipeline.enqueue(callId, "geo");
  }
}

module.exports = {
  runStage,
  buildPrompt
};
