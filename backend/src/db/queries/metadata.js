const crypto = require("crypto");

function createMetadataExtract(db, { callId, runId, schemaVersion, payloadJson, confidenceSummary }) {
  const extractId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const summary =
    confidenceSummary ??
    payloadJson?.confidence_overall ??
    payloadJson?.confidence ??
    null;
  db.prepare(
    "INSERT INTO metadata_extracts (extract_id, call_id, run_id, schema_version, payload_json, confidence_summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    extractId,
    callId,
    runId,
    schemaVersion,
    JSON.stringify(payloadJson),
    summary,
    createdAt
  );
  return extractId;
}

function listMetadataForCall(db, callId) {
  return db
    .prepare("SELECT * FROM metadata_extracts WHERE call_id = ? ORDER BY created_at DESC")
    .all(callId);
}

module.exports = {
  createMetadataExtract,
  listMetadataForCall
};
