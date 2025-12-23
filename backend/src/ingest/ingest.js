const fs = require("fs");
const path = require("path");
const { hashFile } = require("./hash");
const { validateIdempotency } = require("./validate");
const { createCall, updateCallStatus } = require("../db/queries/calls");
const { ensureStage } = require("../db/queries/stages");
const { resolveAgency } = require("../pipeline/agency-normalizer");
const { emitRefresh } = require("../services/events");

function parseTimestampFromFilename(filePath) {
  const base = path.basename(filePath);
  const match = base.match(
    /(\d{4})[_-](\d{2})[_-](\d{2})[_-](\d{2})[_-](\d{2})[_-](\d{2})/
  );
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function ingestFile({ db, pipeline, filePath, config }) {
  const baseName = path.basename(filePath);
  if (baseName.toLowerCase() === ".ds_store") {
    return null;
  }
  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    return null;
  }

  const callId = hashFile(filePath);
  const check = validateIdempotency(db, callId);
  if (!check.ok) {
    return check.existing;
  }
  const firstSeenAt = parseTimestampFromFilename(filePath);

  const call = createCall(db, {
    callId,
    sourcePath: path.resolve(filePath),
    fileSizeBytes: stats.size,
    status: "processing",
    firstSeenAt
  });

  resolveAgency({
    db,
    callId,
    sourcePath: path.resolve(filePath),
    config
  });

  ensureStage(db, callId, "transcription");
  ensureStage(db, callId, "summary");

  updateCallStatus(db, callId, "processing");
  pipeline.enqueue(callId, "transcription");
  emitRefresh("ingest");

  return call;
}

module.exports = {
  ingestFile
};
