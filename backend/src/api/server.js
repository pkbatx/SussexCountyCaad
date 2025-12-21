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
const { listNotificationsHandler } = require("./handlers/notifications");

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

    if (req.method === "GET" && req.url.startsWith("/api/notifications")) {
      return listNotificationsHandler(req, res, { db });
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
