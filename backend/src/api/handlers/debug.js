const { listMetadataForCall } = require("../../db/queries/metadata");
const { getLatestGroupingDecisionForCall } = require("../../db/queries/grouping_decisions");

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function debugEnabled() {
  const value = process.env.CAAD_DEBUG_METADATA;
  return value === "true" || value === "1" || value === "yes";
}

async function debugCallHandler(req, res, { db, callId }) {
  if (!debugEnabled()) {
    return sendJson(res, 403, { error: "debug_disabled" });
  }

  const extracts = listMetadataForCall(db, callId).map((item) => ({
    ...item,
    payload: JSON.parse(item.payload_json)
  }));
  const grouping = getLatestGroupingDecisionForCall(db, callId);

  sendJson(res, 200, {
    call_id: callId,
    metadata_extracts: extracts,
    grouping_decision: grouping
  });
}

module.exports = {
  debugCallHandler
};
