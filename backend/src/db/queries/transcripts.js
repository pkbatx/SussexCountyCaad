const crypto = require("crypto");

function createTranscript(db, { callId, runId, text, language, confidence }) {
  const transcriptId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO transcripts (transcript_id, call_id, run_id, text, language, confidence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(transcriptId, callId, runId, text, language ?? null, confidence ?? null, createdAt);
  return transcriptId;
}

function listTranscriptsForCall(db, callId) {
  return db
    .prepare("SELECT * FROM transcripts WHERE call_id = ? ORDER BY created_at DESC")
    .all(callId);
}

module.exports = {
  createTranscript,
  listTranscriptsForCall
};
