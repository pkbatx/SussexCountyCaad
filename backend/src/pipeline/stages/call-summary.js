const { listTranscriptsForCall } = require("../../db/queries/transcripts");
const { createSummary } = require("../../db/queries/summaries");

async function runStage({ db, callId, runId, pipeline }) {
  const transcripts = listTranscriptsForCall(db, callId);
  if (!transcripts.length) {
    throw new Error("No transcript available for summary");
  }

  const latest = transcripts[0];
  const excerpt = latest.text.slice(0, 400).trim();
  const summaryText = excerpt.length ? excerpt : "Summary unavailable.";

  createSummary(db, {
    subjectType: "call",
    subjectId: callId,
    runId,
    summaryText
  });

  if (pipeline?.enqueue) {
    pipeline.enqueue(callId, "notification");
  }
}

module.exports = {
  runStage
};
