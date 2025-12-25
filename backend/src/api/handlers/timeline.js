const {
  getTranscriptById,
  listTranscriptsForCall
} = require("../../db/queries/timeline");

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function parseEventId(eventId) {
  const decoded = decodeURIComponent(String(eventId || ""));
  const [prefix, ...rest] = decoded.split(":");
  return { prefix, id: rest.join(":") };
}

function timelineTranscriptHandler(req, res, { db, eventId }) {
  const { prefix, id } = parseEventId(eventId);
  if (!prefix || !id) {
    return sendJson(res, 400, { error: "invalid_event_id" });
  }

  if (prefix === "transcript") {
    const transcript = getTranscriptById(db, id);
    if (!transcript) {
      return sendJson(res, 404, { error: "transcript_not_found" });
    }
    const transcripts = listTranscriptsForCall(db, transcript.call_id);
    return sendJson(res, 200, {
      event_id: eventId,
      call_id: transcript.call_id,
      active_transcript_id: transcript.transcript_id,
      transcripts
    });
  }

  if (prefix === "call" || prefix === "dispatch") {
    const transcripts = listTranscriptsForCall(db, id);
    return sendJson(res, 200, {
      event_id: eventId,
      call_id: id,
      transcripts
    });
  }

  return sendJson(res, 400, { error: "unsupported_event_type" });
}

module.exports = {
  timelineTranscriptHandler
};
