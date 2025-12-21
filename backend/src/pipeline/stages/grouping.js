const fs = require("fs");
const path = require("path");
const { createAIAdapter } = require("../../ai/adapter");
const { parseJsonStrict, validatePayload } = require("../../ai/validate");
const { attemptRepair } = require("../../ai/repair");
const { listTranscriptsForCall } = require("../../db/queries/transcripts");
const { listMetadataForCall, createMetadataExtract } = require("../../db/queries/metadata");
const {
  createIncidentGroup,
  addIncidentMember,
  getIncidentById,
  listCandidateIncidents
} = require("../../db/queries/incidents");
const { createAIInvocation } = require("../../db/queries/ai_invocations");
const { selectIncident } = require("../grouping-policy");

const schemaPath = path.join(__dirname, "../../ai/schema/grouping.json");
const schemaText = fs.readFileSync(schemaPath, "utf8");

function tokenizeAddress(value) {
  if (!value) {
    return [];
  }
  return value
    .split(/[^a-zA-Z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function getLatestExtraction(db, callId) {
  const extracts = listMetadataForCall(db, callId)
    .filter((item) => item.schema_version === "extraction.v2")
    .sort((a, b) => (a.created_at > b.created_at ? -1 : 1));

  if (!extracts.length) {
    return null;
  }

  try {
    return JSON.parse(extracts[0].payload_json);
  } catch (_error) {
    return null;
  }
}

function buildPrompt({
  transcriptText,
  extractionSummary,
  candidates,
  threshold,
  callId,
  groupedAt
}) {
  return [
    "You output JSON only. No markdown. No extra keys.",
    "Schema version must be grouping.v2.",
    `If confidence < ${threshold}, set requires_review true and prefer new_incident unless explicit incident_id evidence exists.`,
    "Signals must include weights and evidence when applicable.",
    `call_id: ${callId}`,
    `grouped_at: ${groupedAt}`,
    `Schema: ${schemaText}`,
    `Candidate incidents: ${JSON.stringify(candidates)}`,
    `Current extraction summary: ${JSON.stringify(extractionSummary)}`,
    "Evidence spans must use start_char/end_char indices into the transcript.",
    `Transcript: ${transcriptText}`
  ].join("\n");
}

function buildRepairPrompt({
  transcriptText,
  extractionSummary,
  candidates,
  errors,
  raw,
  threshold,
  callId,
  groupedAt
}) {
  return [
    "The previous response failed schema validation.",
    `Errors: ${JSON.stringify(errors)}`,
    "Return JSON that matches the schema exactly with required fields.",
    "You output JSON only. No markdown. No extra keys.",
    `If confidence < ${threshold}, set requires_review true and prefer new_incident unless explicit incident_id evidence exists.`,
    "Signals must include weights and evidence when applicable.",
    `call_id: ${callId}`,
    `grouped_at: ${groupedAt}`,
    `Schema: ${schemaText}`,
    `Candidate incidents: ${JSON.stringify(candidates)}`,
    `Current extraction summary: ${JSON.stringify(extractionSummary)}`,
    "Evidence spans must use start_char/end_char indices into the transcript.",
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
    stageName: "grouping",
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
    throw new Error("No transcript available for grouping");
  }

  const extraction = getLatestExtraction(db, callId);
  const addressTokens = tokenizeAddress(
    extraction?.address_normalized || extraction?.address_raw
  );
  const windowStart = new Date(
    Date.now() - config.groupingWindowMinutes * 60 * 1000
  ).toISOString();

  const candidates = listCandidateIncidents(db, {
    windowStart,
    limit: config.groupingMaxCandidates,
    addressTokens,
    incidentId: extraction?.incident_id
  });

  const candidateSummary = candidates.map((incident) => ({
    incident_id: incident.incident_id,
    normalized_address: incident.normalized_address,
    incident_identifiers: incident.incident_identifiers,
    member_count: incident.member_count,
    updated_at: incident.updated_at
  }));

  const extractionSummary = extraction
    ? {
        incident_type: extraction.incident_type,
        priority: extraction.priority,
        jurisdiction: extraction.jurisdiction,
        channel: extraction.channel,
        talkgroup: extraction.talkgroup,
        units: extraction.units,
        incident_id: extraction.incident_id,
        address_raw: extraction.address_raw,
        address_normalized: extraction.address_normalized,
        cross_street_1: extraction.cross_street_1,
        cross_street_2: extraction.cross_street_2,
        landmark: extraction.landmark,
        city: extraction.city
      }
    : null;

  const transcriptText = transcripts[0].text;
  const groupedAt = new Date().toISOString();
  const prompt = buildPrompt({
    transcriptText,
    extractionSummary,
    candidates: candidateSummary,
    threshold: config.groupingConfidenceThreshold,
    callId,
    groupedAt
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
            extractionSummary,
            candidates: candidateSummary,
            errors: lastErrors,
            raw: lastRaw,
            threshold: config.groupingConfidenceThreshold,
            callId,
            groupedAt
          });

    const result = await adapter.groupIncident({ prompt: currentPrompt });
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
    if (!validation.ok) {
      lastErrors = validation.errors || [{ message: "Schema validation failed" }];
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
      stageName: "grouping",
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
    throw new Error("Invalid JSON from grouping");
  }

  const finalValidation = validatePayload(schemaPath, payload);
  if (!finalValidation.ok) {
    throw new Error("Grouping schema validation failed");
  }

  createMetadataExtract(db, {
    callId,
    runId,
    schemaVersion: "grouping.v2",
    payloadJson: payload,
    confidenceSummary: payload.confidence
  });

  const decision = selectIncident({
    payload,
    existingIncidents: candidates,
    threshold: config.groupingConfidenceThreshold
  });

  let incidentId = decision.incidentId;
  if (!incidentId || !getIncidentById(db, incidentId)) {
    incidentId = createIncidentGroup(db, {
      normalizedAddress: extraction?.address_normalized || extraction?.address_raw || null,
      incidentIdentifiers: extraction?.incident_id ? [extraction.incident_id] : [],
      groupConfidence: payload.confidence
    });
  } else {
    db.prepare(
      "UPDATE incident_groups SET updated_at = ? WHERE incident_id = ?"
    ).run(new Date().toISOString(), incidentId);
  }

  addIncidentMember(db, {
    incidentId,
    callId,
    linkReason: payload.explanation || decision.reason,
    linkConfidence: payload.confidence
  });

  if (pipeline?.enqueue) {
    pipeline.enqueue(callId, "incidentSummary");
  }
}

module.exports = {
  runStage
};
