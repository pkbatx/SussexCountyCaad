const { listTranscriptsForCall } = require("../../db/queries/transcripts");
const { createSummary } = require("../../db/queries/summaries");

function normalizeDispatchSummary(text) {
  if (!text) {
    return "";
  }
  const chunks = text
    .replace(/\s+/g, " ")
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const seen = new Set();
  const deduped = [];
  chunks.forEach((part) => {
    const key = part.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    deduped.push(part);
  });
  return deduped.join(". ");
}

async function runStage({ db, callId, runId, pipeline }) {
  const transcripts = listTranscriptsForCall(db, callId);
  if (!transcripts.length) {
    throw new Error("No transcript available for summary");
  }

  const latest = transcripts[0];
  const normalized = normalizeDispatchSummary(latest.text);
  const excerpt = normalized.slice(0, 400).trim();
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
