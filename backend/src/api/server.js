// Fastify v5 HTTP layer. Existing handlers under api/handlers/ keep their
// (req, res, deps) signature and write directly to the raw Node response —
// each route here calls reply.hijack() so Fastify does not try to serialize
// or send a body of its own. The SSE route at /api/events relies on this
// hijack pattern as well: the handler keeps the raw socket open, writes
// chunks for each emitRefresh, and unsubscribes on req.on('close'). To
// verify SSE end-to-end, run `npm run dev:backend`, open the frontend, and
// confirm the connection indicator goes green; tail backend logs while
// triggering an emitRefresh in another stage.

const Fastify = require("fastify");
const fastifyCors = require("@fastify/cors");
const log = require("../services/logger");

const { healthHandler } = require("./handlers/health");
const {
  listCallsHandler,
  callDetailHandler,
  retryStageHandler
} = require("./handlers/calls");
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

function hijack(reply) {
  reply.hijack();
}

function bridge(handler) {
  return async (request, reply) => {
    hijack(reply);
    return handler(request.raw, reply.raw);
  };
}

function bridgeWith(handler, build) {
  return async (request, reply) => {
    hijack(reply);
    return handler(request.raw, reply.raw, build(request));
  };
}

async function startApiServer({ config, db, pipeline }) {
  const fastify = Fastify({ logger: false });

  await fastify.register(fastifyCors, {
    origin: config.frontendOrigin || true,
    credentials: true
  });

  // Health -------------------------------------------------------------------
  fastify.get("/api/health", bridge(healthHandler));
  fastify.get("/healthz", async (_request, reply) => {
    reply.code(200).send({ status: "ok" });
  });

  // Timeline routes (handled previously in routes.js) ------------------------
  fastify.get(
    "/api/incidents/:incidentId/timeline",
    bridgeWith(incidentTimelineHandler, (req) => ({
      db,
      incidentId: req.params.incidentId
    }))
  );
  fastify.get(
    "/api/timeline/:eventId/transcript",
    bridgeWith(timelineTranscriptHandler, (req) => ({
      db,
      eventId: req.params.eventId
    }))
  );
  fastify.get(
    "/api/summary/:statementId/evidence",
    bridgeWith(summaryEvidenceHandler, (req) => ({
      db,
      statementId: req.params.statementId
    }))
  );

  // Calls --------------------------------------------------------------------
  fastify.get(
    "/api/calls",
    bridgeWith(listCallsHandler, () => ({ db }))
  );
  fastify.get(
    "/api/calls/:callId",
    bridgeWith(callDetailHandler, (req) => ({ db, callId: req.params.callId }))
  );
  fastify.get(
    "/api/calls/:callId/audio",
    bridgeWith(audioHandler, (req) => ({
      db,
      config,
      callId: req.params.callId
    }))
  );
  fastify.post(
    "/api/calls/:callId/retry",
    bridgeWith(retryStageHandler, (req) => ({
      db,
      pipeline,
      callId: req.params.callId
    }))
  );

  // Incidents ----------------------------------------------------------------
  fastify.get(
    "/api/incidents",
    bridgeWith(listIncidentsHandler, () => ({ db }))
  );
  fastify.get(
    "/api/incidents/:incidentId",
    bridgeWith(incidentDetailHandler, (req) => ({
      db,
      incidentId: req.params.incidentId
    }))
  );

  // Agencies / notifications / signals --------------------------------------
  fastify.get(
    "/api/agencies",
    bridgeWith(listAgenciesHandler, () => ({ db }))
  );
  fastify.get(
    "/api/notifications/log",
    bridgeWith(listNotificationLogHandler, () => ({ db }))
  );
  fastify.get(
    "/api/notifications",
    bridgeWith(listNotificationsHandler, () => ({ db }))
  );
  fastify.get(
    "/api/signals",
    bridgeWith(listSignalsHandler, () => ({ db }))
  );

  // Debug --------------------------------------------------------------------
  fastify.get(
    "/api/debug/calls/:callId",
    bridgeWith(debugCallHandler, (req) => ({
      db,
      callId: req.params.callId
    }))
  );

  // Map ----------------------------------------------------------------------
  fastify.get(
    "/api/map/points",
    bridgeWith(mapPointsHandler, () => ({ db }))
  );

  // Summary (most-specific routes first) -------------------------------------
  fastify.get(
    "/api/summary/hotspots",
    bridgeWith(summaryHotspotsHandler, () => ({ db }))
  );
  fastify.get(
    "/api/summary/digests",
    bridgeWith(summaryDigestHandler, () => ({ db, config }))
  );
  fastify.get(
    "/api/summary/insights",
    bridgeWith(summaryInsightsHandler, () => ({ db }))
  );
  fastify.get(
    "/api/summary/trends",
    bridgeWith(summaryTrendsHandler, () => ({ db }))
  );
  fastify.get(
    "/api/summary",
    bridgeWith(summaryMetricsHandler, () => ({ db }))
  );

  // Server-Sent Events -------------------------------------------------------
  // The eventsHandler keeps the connection open and writes periodic
  // keepalives plus per-emit `event: refresh` lines. reply.hijack() prevents
  // Fastify from finalizing the reply.
  fastify.get("/api/events", async (request, reply) => {
    hijack(reply);
    eventsHandler(request.raw, reply.raw);
  });

  // Feedback -----------------------------------------------------------------
  fastify.post(
    "/api/feedback/calls/:callId",
    bridgeWith(submitCallFeedbackHandler, (req) => ({
      db,
      pipeline,
      callId: req.params.callId
    }))
  );
  fastify.get(
    "/api/feedback/calls/:callId",
    bridgeWith(listCallFeedbackHandler, (req) => ({
      db,
      callId: req.params.callId
    }))
  );
  fastify.post(
    "/api/feedback/incidents/:incidentId",
    bridgeWith(submitIncidentFeedbackHandler, (req) => ({
      db,
      pipeline,
      incidentId: req.params.incidentId
    }))
  );
  fastify.get(
    "/api/feedback/incidents/:incidentId",
    bridgeWith(listIncidentFeedbackHandler, (req) => ({
      db,
      incidentId: req.params.incidentId
    }))
  );

  await fastify.listen({ port: config.apiPort, host: "0.0.0.0" });
  log.info({ port: config.apiPort }, "api listening");
  return fastify;
}

module.exports = {
  startApiServer
};
