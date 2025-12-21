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

function buildPrompt({ transcriptText, callId, extractedAt }) {
  return [
    "You output JSON only. No markdown. No extra keys.",
    "Schema version must be extraction.v2.",
    `Fields: ${extractionFields.join(", ")}`,
    "field_confidence must include a numeric 0-1 value for every field (use 0 for unknown).",
    "evidence must include an array for every field (empty array allowed for unknown).",
    "Every non-null field needs at least one evidence item with transcript spans.",
    "If uncertain, set the field to null or empty and use low confidence.",
    `call_id: ${callId}`,
    `extracted_at: ${extractedAt}`,
    `Schema: ${schemaText}`,
    "Evidence spans must use start_char/end_char indices into the transcript.",
    "Filename metadata: none",
    `Transcript: ${transcriptText}`
  ].join("\n");
}

function buildRepairPrompt({ transcriptText, errors, raw, callId, extractedAt }) {
  return [
    "The previous response failed schema validation.",
    `Errors: ${JSON.stringify(errors)}`,
    "Return JSON that matches the schema exactly with required fields.",
    "You output JSON only. No markdown. No extra keys.",
    `Fields: ${extractionFields.join(", ")}`,
    "field_confidence must include a numeric 0-1 value for every field (use 0 for unknown).",
    "evidence must include an array for every field (empty array allowed for unknown).",
    "Every non-null field needs at least one evidence item with transcript spans.",
    "If uncertain, set the field to null or empty and use low confidence.",
    `call_id: ${callId}`,
    `extracted_at: ${extractedAt}`,
    `Schema: ${schemaText}`,
    "Evidence spans must use start_char/end_char indices into the transcript.",
    "Filename metadata: none",
    `Transcript: ${transcriptText}`,
    `Previous response: ${raw}`
  ].join("\n");
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

  const transcriptText = transcripts[0].text;
  const extractedAt = new Date().toISOString();
  const prompt = buildPrompt({ transcriptText, callId, extractedAt });
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
            extractedAt
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
    lastErrors = [
      ...(validation.errors || []),
      ...(evidenceCheck.errors || []).map((error) => ({
        message: error.message,
        field: error.field
      }))
    ];

    if (!validation.ok || !evidenceCheck.ok) {
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
  if (!finalValidation.ok || !finalEvidenceCheck.ok) {
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
  runStage
};
