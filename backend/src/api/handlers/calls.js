const { listCalls, getCallById } = require("../../db/queries/calls");
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
    minConfidence: filters.minConfidence
  });
  sendJson(res, 200, result);
}

async function callDetailHandler(req, res, { db, callId }) {
  const call = getCallById(db, callId);
  if (!call) {
    return sendJson(res, 404, { error: "call_not_found" });
  }

  const stages = getStagesForCall(db, callId);
  const transcripts = listTranscriptsForCall(db, callId);
  const summaries = listSummariesForCall(db, callId);
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

  sendJson(res, 200, {
    call,
    stages,
    transcripts,
    summaries,
    operator_fields: operatorFields,
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
