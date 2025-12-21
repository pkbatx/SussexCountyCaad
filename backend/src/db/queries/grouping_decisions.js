const crypto = require("crypto");

function createGroupingDecision(
  db,
  {
    decisionId,
    callId,
    incidentId,
    runId,
    decision,
    matchedExistingIncidentId,
    confidence,
    requiresReview,
    signals,
    explanation
  }
) {
  const id = decisionId || crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO grouping_decisions (decision_id, call_id, incident_id, run_id, decision, matched_existing_incident_id, confidence, requires_review, signals_json, explanation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    callId,
    incidentId,
    runId,
    decision,
    matchedExistingIncidentId ?? null,
    confidence ?? 0,
    requiresReview ? 1 : 0,
    JSON.stringify(signals ?? []),
    explanation ?? "",
    createdAt
  );
  return id;
}

function listGroupingDecisionsForIncident(db, incidentId) {
  const rows = db
    .prepare(
      "SELECT * FROM grouping_decisions WHERE incident_id = ? ORDER BY created_at DESC"
    )
    .all(incidentId);
  return rows.map((row) => ({
    ...row,
    requires_review: Boolean(row.requires_review),
    signals: JSON.parse(row.signals_json || "[]")
  }));
}

function getLatestGroupingDecisionForCall(db, callId) {
  const row = db
    .prepare(
      "SELECT * FROM grouping_decisions WHERE call_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .get(callId);
  if (!row) {
    return null;
  }
  return {
    ...row,
    requires_review: Boolean(row.requires_review),
    signals: JSON.parse(row.signals_json || "[]")
  };
}

module.exports = {
  createGroupingDecision,
  listGroupingDecisionsForIncident,
  getLatestGroupingDecisionForCall
};
