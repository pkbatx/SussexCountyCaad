// Single shared pino logger. Modules require this and call e.g.
//   log.info({ callId, stage }, "stage completed")
// pino emits NDJSON to stdout; LOG_LEVEL controls the threshold.

const pino = require("pino");

const VALID_LEVELS = new Set(["trace", "debug", "info", "warn", "error", "fatal"]);

function resolveLevel() {
  const raw = String(process.env.LOG_LEVEL || "info").toLowerCase();
  return VALID_LEVELS.has(raw) ? raw : "info";
}

const log = pino({
  level: resolveLevel(),
  base: { app: "caad-backend" },
  timestamp: pino.stdTimeFunctions.isoTime
});

module.exports = log;
module.exports.default = log;
