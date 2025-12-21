const crypto = require("crypto");
const {
  ensureStage,
  updateStageStatus,
  incrementStageAttempt,
  createStageRun,
  updateStageRun
} = require("../db/queries/stages");

async function runStageWithTracking({ config, db, callId, stageName, handler, pipeline }) {
  ensureStage(db, callId, stageName);
  incrementStageAttempt(db, callId, stageName);

  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const attemptNumber =
    db
      .prepare(
        "SELECT attempt_count FROM call_stages WHERE call_id = ? AND stage_name = ?"
      )
      .get(callId, stageName)?.attempt_count || 1;

  createStageRun(db, {
    runId,
    callId,
    stageName,
    attemptNumber,
    status: "running",
    startedAt
  });

  updateStageStatus(db, callId, stageName, "running", {
    lastRunId: runId,
    startedAt
  });

  try {
    await handler({ config, db, callId, runId, pipeline });
    const completedAt = new Date().toISOString();
    updateStageRun(db, runId, { status: "succeeded", completedAt });
    updateStageStatus(db, callId, stageName, "succeeded", {
      lastRunId: runId,
      completedAt
    });
  } catch (error) {
    const completedAt = new Date().toISOString();
    updateStageRun(db, runId, {
      status: "failed",
      completedAt,
      errorDetail: error.message
    });
    updateStageStatus(db, callId, stageName, "failed", {
      lastRunId: runId,
      completedAt,
      lastError: error.message
    });
    throw error;
  }
}

module.exports = {
  runStageWithTracking
};
