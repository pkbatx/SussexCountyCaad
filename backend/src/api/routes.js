const { incidentTimelineHandler } = require("./handlers/incidents");
const { summaryEvidenceHandler } = require("./handlers/summary");
const { timelineTranscriptHandler } = require("./handlers/timeline");

function handleTimelineRoutes(req, res, { db }) {
  const path = req.url.split("?")[0];
  const parts = path.split("/").filter(Boolean);

  if (req.method === "GET" && parts[0] === "api" && parts[1] === "incidents") {
    if (parts.length === 4 && parts[3] === "timeline") {
      incidentTimelineHandler(req, res, { db, incidentId: parts[2] });
      return true;
    }
  }

  if (req.method === "GET" && parts[0] === "api" && parts[1] === "timeline") {
    if (parts.length === 4 && parts[3] === "transcript") {
      timelineTranscriptHandler(req, res, { db, eventId: parts[2] });
      return true;
    }
  }

  if (req.method === "GET" && parts[0] === "api" && parts[1] === "summary") {
    if (parts.length === 4 && parts[3] === "evidence") {
      summaryEvidenceHandler(req, res, { db, statementId: parts[2] });
      return true;
    }
  }

  return false;
}

module.exports = {
  handleTimelineRoutes
};
