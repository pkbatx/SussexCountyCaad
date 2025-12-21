const fs = require("fs");
const path = require("path");
const { hashFile } = require("./hash");
const { validateIdempotency } = require("./validate");
const { createCall, updateCallStatus } = require("../db/queries/calls");
const { ensureStage } = require("../db/queries/stages");

function ingestFile({ db, pipeline, filePath }) {
  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    return null;
  }

  const callId = hashFile(filePath);
  const check = validateIdempotency(db, callId);
  if (!check.ok) {
    return check.existing;
  }

  const call = createCall(db, {
    callId,
    sourcePath: path.resolve(filePath),
    fileSizeBytes: stats.size,
    status: "processing"
  });

  ensureStage(db, callId, "transcription");
  ensureStage(db, callId, "summary");

  updateCallStatus(db, callId, "processing");
  pipeline.enqueue(callId, "transcription");

  return call;
}

module.exports = {
  ingestFile
};
