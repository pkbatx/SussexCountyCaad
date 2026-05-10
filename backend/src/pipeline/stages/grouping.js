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
const { getCallById } = require("../../db/queries/calls");
const { createGroupingDecision } = require("../../db/queries/grouping_decisions");
const { createAIInvocation } = require("../../db/queries/ai_invocations");
const { listFeedbackSignals } = require("../../db/queries/feedback");
const { listSignals, createSignal } = require("../../db/queries/pipeline_signals");
const { listIncidentMembers } = require("../../db/queries/incidents");
const { selectIncident } = require("../grouping-policy");
const { applyReAlert } = require("../re-alert");

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
  maxSignals,
  callId,
  groupedAt,
  ambiguousNote
}) {
  return [
    "You output JSON only. No markdown. No extra keys.",
    ...(ambiguousNote ? [ambiguousNote] : []),
    "Schema version must be grouping.v2.",
    "incident_id must be a string; use an empty string if unknown.",
    `If confidence < ${threshold}, set requires_review true and prefer new_incident unless explicit incident_id evidence exists.`,
    `Limit signals to the top ${maxSignals} strongest matches.`,
    "Signals must include weights and evidence when applicable.",
    "Signal value must be a string or object; omit evidence if unsure.",
    "explanation must be one short sentence naming the strongest signals.",
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
  maxSignals,
  callId,
  groupedAt,
  ambiguousNote
}) {
  return [
    "The previous response failed schema validation.",
    `Errors: ${JSON.stringify(errors)}`,
    "Return JSON that matches the schema exactly with required fields.",
    "You output JSON only. No markdown. No extra keys.",
    ...(ambiguousNote ? [ambiguousNote] : []),
    "incident_id must be a string; use an empty string if unknown.",
    `If confidence < ${threshold}, set requires_review true and prefer new_incident unless explicit incident_id evidence exists.`,
    `Limit signals to the top ${maxSignals} strongest matches.`,
    "Signals must include weights and evidence when applicable.",
    "Signal value must be a string or object; omit evidence if unsure.",
    "explanation must be one short sentence naming the strongest signals.",
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

function signalLabel(type) {
  const labels = {
    incident_id_match: "incident id match",
    address_match: "address match",
    cross_street_match: "cross street match",
    unit_overlap: "unit overlap",
    time_proximity: "time proximity",
    jurisdiction_match: "jurisdiction match",
    channel_match: "channel match",
    text_similarity: "text similarity"
  };
  return labels[type] || type || "signal";
}

const ALLOWED_SIGNAL_TYPES = new Set([
  "incident_id_match",
  "address_match",
  "cross_street_match",
  "unit_overlap",
  "time_proximity",
  "jurisdiction_match",
  "channel_match",
  "text_similarity"
]);

function isValidSpan(item) {
  if (!item || typeof item !== "object") {
    return false;
  }
  const hasCharSpan =
    Number.isInteger(item.start_char) && Number.isInteger(item.end_char);
  const hasSegmentSpan =
    typeof item.segment_id === "string" &&
    typeof item.t_start === "number" &&
    typeof item.t_end === "number";
  return hasCharSpan || hasSegmentSpan;
}

function sanitizeEvidence(evidence) {
  if (!Array.isArray(evidence)) {
    return undefined;
  }
  const filtered = evidence.filter(
    (item) =>
      item &&
      typeof item.text === "string" &&
      item.text.trim().length > 0 &&
      typeof item.reason === "string" &&
      item.reason.trim().length > 0 &&
      isValidSpan(item)
  );
  return filtered.length ? filtered : undefined;
}

function sanitizeSignal(signal) {
  if (!signal || typeof signal !== "object") {
    return null;
  }
  if (!ALLOWED_SIGNAL_TYPES.has(signal.type)) {
    return null;
  }
  const valueType = typeof signal.value;
  let value = signal.value;
  if (valueType === "number") {
    value = String(value);
  }
  if (valueType !== "string" && valueType !== "object") {
    return null;
  }
  const weight = Number(signal.weight);
  if (!Number.isFinite(weight)) {
    return null;
  }
  const clamped = Math.min(Math.max(weight, 0), 1);
  const cleaned = { type: signal.type, value, weight: clamped };
  const evidence = sanitizeEvidence(signal.evidence);
  if (evidence) {
    cleaned.evidence = evidence;
  }
  return cleaned;
}

function formatWeight(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "n/a";
  }
  return value.toFixed(2);
}

function buildGroupingSummary(payload) {
  const signals = Array.isArray(payload?.signals) ? payload.signals : [];
  const summarySignals = signals.length
    ? signals
        .map((signal) => `${signalLabel(signal.type)} ${formatWeight(signal.weight)}`)
        .join(", ")
    : "no strong signals";
  const decision = payload?.decision || "decision";
  const confidence = formatWeight(payload?.confidence);
  const review = payload?.requires_review ? "requires review" : "no review";
  return `${decision}: ${summarySignals}; confidence ${confidence}; ${review}`;
}

function normalizeGroupingPayload(payload, maxSignals) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  if (payload.incident_id === null || payload.incident_id === undefined) {
    payload.incident_id = "";
  }
  if (payload.matched_existing_incident_id === undefined) {
    payload.matched_existing_incident_id = null;
  }
  if (Array.isArray(payload.signals)) {
    const sorted = payload.signals
      .map(sanitizeSignal)
      .filter(Boolean)
      .sort(
        (left, right) => (Number(right.weight) || 0) - (Number(left.weight) || 0)
      );
    payload.signals = Number.isFinite(maxSignals)
      ? sorted.slice(0, maxSignals)
      : sorted;
  } else {
    payload.signals = [];
  }
  return payload;
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

  const ambiguousSignals = listSignals(db, {
    callId,
    signal: "ambiguous",
    limit: 10
  });
  const ambiguousNote = buildAmbiguousNote(ambiguousSignals);

  const prompt = buildPrompt({
    transcriptText,
    extractionSummary,
    candidates: candidateSummary,
    threshold: config.groupingConfidenceThreshold,
    maxSignals: config.groupingMaxSignals,
    callId,
    groupedAt,
    ambiguousNote
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
            maxSignals: config.groupingMaxSignals,
            callId,
            groupedAt,
            ambiguousNote
          });

    const result = await adapter.groupIncident({ prompt: currentPrompt });
    lastRaw = result.content || "";

    try {
      payload = parseJsonStrict(result.content);
    } catch (_error) {
      payload = attemptRepair(result.content);
    }

    payload = normalizeGroupingPayload(payload, config.groupingMaxSignals);

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

    const rawExplanation = payload.explanation;
    payload.explanation = buildGroupingSummary(payload);

    createAIInvocation(db, {
      callId,
      stageName: "grouping",
      provider: "openai",
      model: result.model,
      requestJson: { prompt: currentPrompt },
      responseJson: { payload, raw_explanation: rawExplanation },
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

  const feedbackSignals = payload.matched_existing_incident_id
    ? listFeedbackSignals(db, {
        incidentId: payload.matched_existing_incident_id,
        signalType: "contradiction"
      })
    : [];
  const feedbackPenalty = Math.min(
    config.feedbackMaxPenalty,
    config.feedbackConfidencePenalty * feedbackSignals.length
  );

  const selection = selectIncident({
    payload,
    existingIncidents: candidates,
    threshold: config.groupingConfidenceThreshold,
    confidencePenalty: feedbackPenalty
  });

  let incidentId = selection.incidentId;
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
    linkReason: payload.explanation || selection.reason,
    linkConfidence: payload.confidence
  });

  createGroupingDecision(db, {
    callId,
    incidentId,
    runId,
    decision: payload.decision,
    matchedExistingIncidentId: payload.matched_existing_incident_id,
    confidence: payload.confidence,
    requiresReview: selection.requiresReview,
    signals: payload.signals,
    explanation: payload.explanation
  });

  const call = getCallById(db, callId);
  if (call?.agency_id && call?.first_seen_at) {
    applyReAlert({
      db,
      callId,
      incidentId,
      agencyId: call.agency_id,
      occurredAt: call.first_seen_at,
      windowMinutes: config.reAlertWindowMinutes
    });
  }

  recordRetryBreadcrumb({ db, callId, incidentId, ambiguousSignals });

  if (pipeline?.enqueue) {
    pipeline.enqueue(callId, "incidentSummary");
  }
}

function buildAmbiguousNote(signals) {
  if (!Array.isArray(signals) || signals.length === 0) return null;
  const fields = new Set();
  for (const row of signals) {
    const reason = row?.reason || "";
    const match = reason.match(/low_confidence:([^;]+)/);
    if (match) {
      match[1].split(",").map((s) => s.trim()).filter(Boolean).forEach((f) => fields.add(f));
    }
    if (reason.includes("ambiguous_location")) {
      fields.add("location");
    }
  }
  if (!fields.size) return null;
  return `Note: extraction confidence was low for [${Array.from(fields).join(", ")}]. Weight geographic proximity more heavily than call-type similarity for this call.`;
}

function recordRetryBreadcrumb({ db, callId, incidentId, ambiguousSignals }) {
  if (!incidentId || !ambiguousSignals?.length) return;
  const members = listIncidentMembers(db, incidentId);
  if (members.length >= 2) return;
  createSignal(db, {
    callId,
    stage: "grouping",
    signal: "retry_grouping",
    reason: `singleton incident ${incidentId} with ambiguous extraction`
  });
}

module.exports = {
  runStage,
  buildGroupingSummary,
  normalizeGroupingPayload
};
