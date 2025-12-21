function ensureStage(db, callId, stageName) {
  db.prepare(
    "INSERT OR IGNORE INTO call_stages (call_id, stage_name, status, attempt_count) VALUES (?, ?, ?, 0)"
  ).run(callId, stageName, "pending");
}

function getStagesForCall(db, callId) {
  return db
    .prepare("SELECT * FROM call_stages WHERE call_id = ? ORDER BY stage_name")
    .all(callId);
}

function updateStageStatus(db, callId, stageName, status, fields = {}) {
  db.prepare(
    "UPDATE call_stages SET status = ?, last_run_id = ?, last_error = ?, started_at = ?, completed_at = ? WHERE call_id = ? AND stage_name = ?"
  ).run(
    status,
    fields.lastRunId ?? null,
    fields.lastError ?? null,
    fields.startedAt ?? null,
    fields.completedAt ?? null,
    callId,
    stageName
  );
}

function incrementStageAttempt(db, callId, stageName) {
  db.prepare(
    "UPDATE call_stages SET attempt_count = attempt_count + 1 WHERE call_id = ? AND stage_name = ?"
  ).run(callId, stageName);
}

function createStageRun(db, run) {
  db.prepare(
    "INSERT INTO stage_runs (run_id, call_id, stage_name, attempt_number, status, started_at, completed_at, error_detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    run.runId,
    run.callId,
    run.stageName,
    run.attemptNumber,
    run.status,
    run.startedAt,
    run.completedAt ?? null,
    run.errorDetail ?? null
  );
}

function updateStageRun(db, runId, fields) {
  db.prepare(
    "UPDATE stage_runs SET status = ?, completed_at = ?, error_detail = ? WHERE run_id = ?"
  ).run(fields.status, fields.completedAt ?? null, fields.errorDetail ?? null, runId);
}

module.exports = {
  ensureStage,
  getStagesForCall,
  updateStageStatus,
  incrementStageAttempt,
  createStageRun,
  updateStageRun
};
