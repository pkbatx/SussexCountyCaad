const crypto = require("crypto");

function nextSummaryVersion(db, subjectType, subjectId) {
  const row = db
    .prepare(
      "SELECT MAX(version) as max_version FROM summaries WHERE subject_type = ? AND subject_id = ?"
    )
    .get(subjectType, subjectId);
  return (row?.max_version || 0) + 1;
}

function createSummary(db, { subjectType, subjectId, runId, summaryText }) {
  const summaryId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const version = nextSummaryVersion(db, subjectType, subjectId);

  db.prepare(
    "INSERT INTO summaries (summary_id, subject_type, subject_id, run_id, summary_text, created_at, version) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(summaryId, subjectType, subjectId, runId, summaryText, createdAt, version);

  return summaryId;
}

function listSummariesForCall(db, callId) {
  return db
    .prepare(
      "SELECT * FROM summaries WHERE subject_type = 'call' AND subject_id = ? ORDER BY version DESC"
    )
    .all(callId);
}

function listSummariesForIncident(db, incidentId) {
  return db
    .prepare(
      "SELECT * FROM summaries WHERE subject_type = 'incident' AND subject_id = ? ORDER BY version DESC"
    )
    .all(incidentId);
}

module.exports = {
  createSummary,
  listSummariesForCall,
  listSummariesForIncident
};
