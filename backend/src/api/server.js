// Fastify v5 HTTP layer. Existing handlers under api/handlers/ keep their
// (req, res, deps) signature; each route calls reply.hijack() and forwards
// request.raw / reply.raw so handlers write directly to the Node socket.
// /api/events relies on the same hijack so SSE streaming isn't finalized.

const Fastify = require("fastify");
const fastifyCors = require("@fastify/cors");
const log = require("../services/logger");

const { healthHandler } = require("./handlers/health");
const { listCallsHandler, callDetailHandler, retryStageHandler } = require("./handlers/calls");
const { audioHandler } = require("./handlers/audio");
const {
  listIncidentsHandler,
  incidentDetailHandler,
  incidentTimelineHandler
} = require("./handlers/incidents");
const { listAgenciesHandler } = require("./handlers/agencies");
const { listNotificationsHandler } = require("./handlers/notifications");
const { listNotificationLogHandler } = require("./handlers/notification_log");
const { eventsHandler } = require("./handlers/events");
const { listSignalsHandler } = require("./handlers/signals");
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
  summaryInsightsHandler,
  summaryDigestHandler,
  summaryTrendsHandler,
  summaryHotspotsHandler,
  summaryEvidenceHandler
} = require("./handlers/summary");
const { timelineTranscriptHandler } = require("./handlers/timeline");

function bridge(handler, build) {
  return async (request, reply) => {
    reply.hijack();
    return handler(request.raw, reply.raw, build ? build(request) : undefined);
  };
}

async function startApiServer({ config, db, pipeline }) {
  const fastify = Fastify({ logger: false });

  await fastify.register(fastifyCors, {
    origin: config.frontendOrigin || true,
    credentials: true
  });

  fastify.get("/healthz", async (_req, reply) => reply.code(200).send({ status: "ok" }));
  fastify.get("/api/health", bridge(healthHandler));

  fastify.get("/api/incidents/:incidentId/timeline",
    bridge(incidentTimelineHandler, (req) => ({ db, incidentId: req.params.incidentId })));
  fastify.get("/api/timeline/:eventId/transcript",
    bridge(timelineTranscriptHandler, (req) => ({ db, eventId: req.params.eventId })));
  fastify.get("/api/summary/:statementId/evidence",
    bridge(summaryEvidenceHandler, (req) => ({ db, statementId: req.params.statementId })));

  fastify.get("/api/calls", bridge(listCallsHandler, () => ({ db })));
  fastify.get("/api/calls/:callId",
    bridge(callDetailHandler, (req) => ({ db, callId: req.params.callId })));
  fastify.get("/api/calls/:callId/audio",
    bridge(audioHandler, (req) => ({ db, config, callId: req.params.callId })));
  fastify.post("/api/calls/:callId/retry",
    bridge(retryStageHandler, (req) => ({ db, pipeline, callId: req.params.callId })));

  fastify.get("/api/incidents", bridge(listIncidentsHandler, () => ({ db })));
  fastify.get("/api/incidents/:incidentId",
    bridge(incidentDetailHandler, (req) => ({ db, incidentId: req.params.incidentId })));

  fastify.get("/api/agencies", bridge(listAgenciesHandler, () => ({ db })));
  fastify.get("/api/notifications/log", bridge(listNotificationLogHandler, () => ({ db })));
  fastify.get("/api/notifications", bridge(listNotificationsHandler, () => ({ db })));
  fastify.get("/api/signals", bridge(listSignalsHandler, () => ({ db })));

  fastify.get("/api/debug/calls/:callId",
    bridge(debugCallHandler, (req) => ({ db, callId: req.params.callId })));

  fastify.get("/api/map/points", bridge(mapPointsHandler, () => ({ db })));

  // Most-specific summary paths first; Fastify's prefix matcher honors
  // first-registered when overlapping routes are declared.
  fastify.get("/api/summary/hotspots", bridge(summaryHotspotsHandler, () => ({ db })));
  fastify.get("/api/summary/digests", bridge(summaryDigestHandler, () => ({ db, config })));
  fastify.get("/api/summary/insights", bridge(summaryInsightsHandler, () => ({ db })));
  fastify.get("/api/summary/trends", bridge(summaryTrendsHandler, () => ({ db })));
  fastify.get("/api/summary", bridge(summaryMetricsHandler, () => ({ db })));

  fastify.get("/api/events", async (request, reply) => {
    reply.hijack();
    eventsHandler(request.raw, reply.raw);
  });

  fastify.post("/api/feedback/calls/:callId",
    bridge(submitCallFeedbackHandler, (req) => ({ db, pipeline, callId: req.params.callId })));
  fastify.get("/api/feedback/calls/:callId",
    bridge(listCallFeedbackHandler, (req) => ({ db, callId: req.params.callId })));
  fastify.post("/api/feedback/incidents/:incidentId",
    bridge(submitIncidentFeedbackHandler, (req) => ({ db, pipeline, incidentId: req.params.incidentId })));
  fastify.get("/api/feedback/incidents/:incidentId",
    bridge(listIncidentFeedbackHandler, (req) => ({ db, incidentId: req.params.incidentId })));

  await fastify.listen({ port: config.apiPort, host: "0.0.0.0" });
  log.info({ port: config.apiPort }, "api listening");
  return fastify;
}

module.exports = { startApiServer };
