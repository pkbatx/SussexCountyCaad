const http = require("http");
const { healthHandler } = require("./handlers/health");
const {
  listCallsHandler,
  callDetailHandler,
  retryStageHandler
} = require("./handlers/calls");
const {
  listIncidentsHandler,
  incidentDetailHandler
} = require("./handlers/incidents");
const { listAgenciesHandler } = require("./handlers/agencies");
const { listNotificationsHandler } = require("./handlers/notifications");
const {
  submitCallFeedbackHandler,
  submitIncidentFeedbackHandler,
  listCallFeedbackHandler,
  listIncidentFeedbackHandler
} = require("./handlers/feedback");
const { mapPointsHandler } = require("./handlers/map");
const { debugCallHandler } = require("./handlers/debug");
const {
  summaryMetricsHandler,
  summaryTrendsHandler,
  summaryHotspotsHandler
} = require("./handlers/summary");

function startApiServer({ config, db, pipeline }) {
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/api/health") {
      return healthHandler(req, res);
    }

    if (req.method === "GET" && req.url.startsWith("/api/calls")) {
      const parts = req.url.split("?")[0].split("/").filter(Boolean);
      if (parts.length === 2) {
        return listCallsHandler(req, res, { db });
      }
      if (parts.length === 3) {
        return callDetailHandler(req, res, { db, callId: parts[2] });
      }
    }

    if (req.method === "POST" && req.url.startsWith("/api/calls/")) {
      const parts = req.url.split("?")[0].split("/").filter(Boolean);
      if (parts.length === 4 && parts[3] === "retry") {
        return retryStageHandler(req, res, { pipeline, db, callId: parts[2] });
      }
    }

    if (req.method === "GET" && req.url.startsWith("/api/incidents")) {
      const parts = req.url.split("?")[0].split("/").filter(Boolean);
      if (parts.length === 2) {
        return listIncidentsHandler(req, res, { db });
      }
      if (parts.length === 3) {
        return incidentDetailHandler(req, res, { db, incidentId: parts[2] });
      }
    }

    if (req.method === "GET" && req.url.startsWith("/api/agencies")) {
      return listAgenciesHandler(req, res, { db });
    }

    if (req.method === "GET" && req.url.startsWith("/api/notifications")) {
      return listNotificationsHandler(req, res, { db });
    }

    if (req.method === "GET" && req.url.startsWith("/api/debug/calls/")) {
      const parts = req.url.split("?")[0].split("/").filter(Boolean);
      if (parts.length === 4) {
        return debugCallHandler(req, res, { db, callId: parts[3] });
      }
    }

    if (req.method === "GET" && req.url.startsWith("/api/map/points")) {
      return mapPointsHandler(req, res, { db });
    }

    if (req.method === "GET" && req.url.startsWith("/api/summary/hotspots")) {
      return summaryHotspotsHandler(req, res, { db });
    }

    if (req.method === "GET" && req.url.startsWith("/api/summary/trends")) {
      return summaryTrendsHandler(req, res, { db });
    }

    if (req.method === "GET" && req.url.startsWith("/api/summary")) {
      return summaryMetricsHandler(req, res, { db });
    }

    if (req.url.startsWith("/api/feedback/")) {
      const parts = req.url.split("?")[0].split("/").filter(Boolean);
      if (parts.length === 4 && parts[2] === "calls") {
        if (req.method === "POST") {
          return submitCallFeedbackHandler(req, res, {
            db,
            callId: parts[3]
          });
        }
        if (req.method === "GET") {
          return listCallFeedbackHandler(req, res, {
            db,
            callId: parts[3]
          });
        }
      }
      if (parts.length === 4 && parts[2] === "incidents") {
        if (req.method === "POST") {
          return submitIncidentFeedbackHandler(req, res, {
            db,
            incidentId: parts[3]
          });
        }
        if (req.method === "GET") {
          return listIncidentFeedbackHandler(req, res, {
            db,
            incidentId: parts[3]
          });
        }
      }
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });

  server.listen(config.apiPort, () => {
    console.log(`[api] listening on ${config.apiPort}`);
  });

  return server;
}

module.exports = {
  startApiServer
};
