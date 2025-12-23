const fs = require("fs");
const path = require("path");
const { getCallById } = require("../../db/queries/calls");

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function guessContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".m4a") return "audio/mp4";
  return "application/octet-stream";
}

function audioHandler(req, res, { db, callId, config }) {
  const call = getCallById(db, callId);
  if (!call?.source_path) {
    return sendJson(res, 404, { error: "audio_not_found" });
  }
  const resolved = path.resolve(call.source_path);
  if (config?.callsDir) {
    const callsDir = path.resolve(config.callsDir);
    if (!resolved.startsWith(callsDir)) {
      return sendJson(res, 403, { error: "audio_access_denied" });
    }
  }

  let stat;
  try {
    stat = fs.statSync(resolved);
  } catch (_error) {
    return sendJson(res, 404, { error: "audio_not_found" });
  }

  const range = req.headers.range;
  const contentType = guessContentType(resolved);
  if (!range) {
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stat.size
    });
    fs.createReadStream(resolved).pipe(res);
    return;
  }

  const match = /bytes=(\d+)-(\d+)?/.exec(range);
  if (!match) {
    res.writeHead(416, {
      "Content-Range": `bytes */${stat.size}`
    });
    res.end();
    return;
  }

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : stat.size - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start >= stat.size) {
    res.writeHead(416, {
      "Content-Range": `bytes */${stat.size}`
    });
    res.end();
    return;
  }

  const boundedEnd = Math.min(end, stat.size - 1);
  const chunkSize = boundedEnd - start + 1;

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${boundedEnd}/${stat.size}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": contentType
  });

  fs.createReadStream(resolved, { start, end: boundedEnd }).pipe(res);
}

module.exports = {
  audioHandler
};
