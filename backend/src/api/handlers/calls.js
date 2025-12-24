const { listCalls, getCallById } = require("../../db/queries/calls");
const { getLatestGroupingDecisionForCall } = require("../../db/queries/grouping_decisions");
const { buildConfidenceSignal, summarizeLinkReason } = require("../../services/confidence");
const { getStagesForCall } = require("../../db/queries/stages");
const { listTranscriptsForCall } = require("../../db/queries/transcripts");
const { listSummariesForCall } = require("../../db/queries/summaries");
const { listMetadataForCall } = require("../../db/queries/metadata");
const { listLocationsForSubject } = require("../../db/queries/locations");
const { listReferenceCandidates } = require("../../db/queries/reference_data");
const { extractTownFromGeocode, normalizeTownQuery } = require("../../geo/town-utils");
const { parseListFilters } = require("./filters");

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function normalizeCallListItem(call) {
  const incidentId = call.incident_id ?? call.incidentId ?? null;
  const transcriptionStatus = call.transcription_status ?? null;
  const groupingStatus = call.grouping_status ?? null;
  const progressState = deriveProgressState({
    incidentId,
    status: call.status,
    transcriptionStatus,
    groupingStatus
  });
  const confidenceSignal = buildConfidenceSignal({
    confidence: call.grouping_confidence,
    requiresReview: Boolean(call.grouping_requires_review)
  });
  return {
    call_id: call.call_id,
    status: call.status,
    first_seen_at: call.first_seen_at,
    agency: call.agency ?? call.agency_name ?? null,
    service_type: call.service_type ?? null,
    incident_type: call.incident_type ?? null,
    address: call.address ?? null,
    town: call.town ?? null,
    cross_street: call.cross_street ?? null,
    poi: call.poi ?? null,
    summary: call.summary ?? null,
    re_alert: call.re_alert ?? call.re_alert_flag ?? 0,
    incident_id: incidentId,
    incident_linked: Boolean(incidentId),
    transcription_status: transcriptionStatus,
    grouping_status: groupingStatus,
    progress_state: progressState,
    confidence_signal: confidenceSignal
  };
}

function deriveProgressState({ incidentId, status, transcriptionStatus, groupingStatus }) {
  if (incidentId) return "grouped";
  const transcriptionActive = ["pending", "running", "processing"].includes(
    String(transcriptionStatus || "").toLowerCase()
  );
  if (transcriptionActive) return "transcribing";
  const groupingActive = ["pending", "running", "processing"].includes(
    String(groupingStatus || "").toLowerCase()
  );
  if (groupingActive) return "analyzing";
  if (status === "failed") return "failed";
  if (status === "succeeded" || status === "processing") return "pending_incident";
  return "received";
}

function normalizeStage(stage) {
  return {
    stage_name: stage.stage_name ?? stage.stage,
    status: stage.status
  };
}

function normalizeTranscript(transcript) {
  return {
    transcript_id: transcript.transcript_id,
    text: transcript.text,
    language: transcript.language ?? null,
    created_at: transcript.created_at
  };
}

function normalizeSummary(summary) {
  return {
    summary_id: summary.summary_id,
    summary_text: summary.summary_text,
    created_at: summary.created_at,
    version: summary.version
  };
}

function resolveTownFallback(db, callId) {
  const locations = listLocationsForSubject(db, { subjectType: "call", subjectId: callId });
  if (!locations.length) {
    return null;
  }
  const town = extractTownFromGeocode(locations[0]?.geocode_json);
  const normalized = normalizeTownQuery(town);
  if (!normalized) {
    return null;
  }
  const matches = listReferenceCandidates(db, {
    refType: "town",
    query: normalized,
    limit: 1
  });
  return matches[0]?.canonical_name || null;
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function listCallsHandler(req, res, { db }) {
  const filters = parseListFilters(req);
  const result = listCalls(db, {
    status: filters.status,
    q: filters.q,
    limit: filters.limit,
    offset: filters.offset,
    start: filters.start,
    end: filters.end,
    incidentType: filters.incidentType,
    jurisdiction: filters.jurisdiction,
    agency: filters.agency,
    serviceType: filters.serviceType,
    minConfidence: filters.minConfidence,
    pendingIncident: filters.pendingIncident
  });
  const items = result.items.map(normalizeCallListItem);
  sendJson(res, 200, { items, total: result.total });
}

async function callDetailHandler(req, res, { db, callId }) {
  const call = getCallById(db, callId);
  if (!call) {
    return sendJson(res, 404, { error: "call_not_found" });
  }

  const stages = getStagesForCall(db, callId);
  const transcripts = listTranscriptsForCall(db, callId);
  const summaries = listSummariesForCall(db, callId);
  const groupingDecision = getLatestGroupingDecisionForCall(db, callId);
  const extracts = listMetadataForCall(db, callId)
    .filter((item) => item.schema_version === "extraction.v2")
    .sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
  let extracted = null;
  try {
    extracted = extracts.length ? JSON.parse(extracts[0].payload_json) : null;
  } catch (_error) {
    extracted = null;
  }

  const operatorFields = {
    agency: call.agency_name || null,
    incident_type: extracted?.incident_type ?? null,
    address:
      extracted?.address_normalized ??
      extracted?.address_raw ??
      null,
    town:
      extracted?.city ??
      extracted?.jurisdiction ??
      resolveTownFallback(db, callId),
    cross_street:
      extracted?.cross_street_1 ??
      extracted?.cross_street_2 ??
      null,
    poi: extracted?.landmark ?? null,
    summary: summaries[0]?.summary_text ?? null
  };

  const callView = normalizeCallListItem({
    ...call,
    agency: operatorFields.agency,
    incident_type: operatorFields.incident_type,
    address: operatorFields.address,
    town: operatorFields.town,
    cross_street: operatorFields.cross_street,
    poi: operatorFields.poi,
    summary: operatorFields.summary,
    re_alert: call.re_alert_flag,
    incident_id: groupingDecision?.incident_id ?? call.incident_id ?? null,
    grouping_confidence: groupingDecision?.confidence ?? null,
    grouping_requires_review: groupingDecision?.requires_review ?? false,
    transcription_status: stages.find((stage) => stage.stage_name === "transcription")?.status,
    grouping_status: stages.find((stage) => stage.stage_name === "grouping")?.status
  });
  const audio = call.source_path
    ? { url: `/api/calls/${callId}/audio`, format: call.audio_format ?? null }
    : null;

  sendJson(res, 200, {
    call: callView,
    stages: stages.map(normalizeStage),
    transcripts: transcripts.map(normalizeTranscript),
    summaries: summaries.map(normalizeSummary),
    operator_fields: operatorFields,
    confidence_signal: buildConfidenceSignal({
      confidence: groupingDecision?.confidence ?? null,
      requiresReview: groupingDecision?.requires_review ?? false,
      reasonLabel: summarizeLinkReason(groupingDecision?.explanation || groupingDecision?.decision)
    }),
    audio,
    locations: [],
    notifications: [],
    incidents: []
  });
}

async function retryStageHandler(req, res, { pipeline, db, callId }) {
  if (!pipeline?.enqueue) {
    return sendJson(res, 500, { error: "pipeline_unavailable" });
  }

  const body = await readJsonBody(req);
  if (!body.stage) {
    return sendJson(res, 400, { error: "stage_required" });
  }

  pipeline.enqueue(callId, body.stage);
  const stages = getStagesForCall(db, callId);
  const stage = stages.find((item) => item.stage_name === body.stage);
  sendJson(res, 200, stage || { stage: body.stage, status: "queued" });
}

module.exports = {
  listCallsHandler,
  callDetailHandler,
  retryStageHandler
};
