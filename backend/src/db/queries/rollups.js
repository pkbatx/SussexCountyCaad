const crypto = require("crypto");

function nextRollupVersion(db, incidentId) {
  const row = db
    .prepare(
      "SELECT MAX(version) as max_version FROM incident_rollups WHERE incident_id = ?"
    )
    .get(incidentId);
  return (row?.max_version || 0) + 1;
}

function createIncidentRollup(db, {
  incidentId,
  runId,
  summaryText,
  latestUpdate,
  keyFields,
  confidence,
  openQuestions,
  includedCallIds
}) {
  const rollupId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const version = nextRollupVersion(db, incidentId);

  db.prepare(
    "INSERT INTO incident_rollups (rollup_id, incident_id, run_id, version, summary_text, latest_update_json, key_fields_json, confidence, open_questions_json, included_call_ids_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    rollupId,
    incidentId,
    runId,
    version,
    summaryText,
    JSON.stringify(latestUpdate ?? []),
    JSON.stringify(keyFields ?? {}),
    confidence ?? 0,
    JSON.stringify(openQuestions ?? []),
    JSON.stringify(includedCallIds ?? []),
    createdAt
  );

  return rollupId;
}

function listRollupsForIncident(db, incidentId) {
  const rows = db
    .prepare(
      "SELECT * FROM incident_rollups WHERE incident_id = ? ORDER BY version DESC"
    )
    .all(incidentId);

  return rows.map((row) => ({
    ...row,
    latest_update: JSON.parse(row.latest_update_json),
    key_fields: JSON.parse(row.key_fields_json),
    open_questions: JSON.parse(row.open_questions_json),
    included_call_ids: JSON.parse(row.included_call_ids_json)
  }));
}

module.exports = {
  createIncidentRollup,
  listRollupsForIncident
};
