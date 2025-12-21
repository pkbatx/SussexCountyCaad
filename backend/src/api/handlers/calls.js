const { listCalls, getCallById } = require("../../db/queries/calls");
const { getStagesForCall } = require("../../db/queries/stages");
const { listTranscriptsForCall } = require("../../db/queries/transcripts");
const { listSummariesForCall } = require("../../db/queries/summaries");
const { listMetadataForCall } = require("../../db/queries/metadata");
const { parseListFilters } = require("./filters");

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
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
  const metadataExtracts = listMetadataForCall(db, callId).map((item) => ({
    ...item,
    payload: JSON.parse(item.payload_json)
  }));

  sendJson(res, 200, {
    call,
    stages,
    transcripts,
    metadataExtracts,
    summaries,
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
