const crypto = require("crypto");

function createFeedbackSignal(
  db,
  { feedbackId, incidentId, callId, priorDecisionId, signalType, details, adjustment }
) {
  const id = feedbackId || crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO feedback_signals (feedback_id, incident_id, call_id, prior_decision_id, signal_type, details_json, adjustment_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    incidentId ?? null,
    callId ?? null,
    priorDecisionId ?? null,
    signalType,
    JSON.stringify(details ?? {}),
    JSON.stringify(adjustment ?? {}),
    createdAt
  );
  return id;
}

function listFeedbackSignals(db, { incidentId, callId, signalType, since } = {}) {
  const rows = db
    .prepare(
      "SELECT * FROM feedback_signals WHERE (? IS NULL OR incident_id = ?) AND (? IS NULL OR call_id = ?) AND (? IS NULL OR signal_type = ?) AND (? IS NULL OR created_at >= ?) ORDER BY created_at DESC"
    )
    .all(incidentId ?? null, incidentId ?? null, callId ?? null, callId ?? null, signalType ?? null, signalType ?? null, since ?? null, since ?? null);

  return rows.map((row) => ({
    ...row,
    details: row.details_json ? JSON.parse(row.details_json) : {},
    adjustment: row.adjustment_json ? JSON.parse(row.adjustment_json) : {}
  }));
}

module.exports = {
  createFeedbackSignal,
  listFeedbackSignals,
  listFeedbackForCall: (db, callId) => listFeedbackSignals(db, { callId }),
  listFeedbackForIncident: (db, incidentId) =>
    listFeedbackSignals(db, { incidentId })
};
