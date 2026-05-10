const { recordNotificationLog } = require("../db/queries/notification_log");

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 2;

// Fire-and-forget notification send with logging + one retry on 5xx.
//   send: (signal) => Promise<Response>
// Returns { ok, status, attempt }; throws on final failure so the
// notification stage's existing try/catch keeps working.
async function notifyWithRetry({
  db,
  channel,
  payload,
  send,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) {
  let lastStatus = null;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await send(controller.signal);
      clearTimeout(timer);

      const status = response.status;
      const ok = response.ok;
      let errorDetail = null;
      if (!ok) {
        try {
          errorDetail = (await response.text()).slice(0, 500);
        } catch (_err) {
          errorDetail = `HTTP ${status}`;
        }
      }

      if (db) {
        recordNotificationLog(db, {
          channel,
          payload,
          status,
          error: errorDetail,
          attempt
        });
      }

      if (ok) {
        return { ok: true, status, attempt };
      }

      lastStatus = status;
      lastError = errorDetail || `HTTP ${status}`;

      // Only retry on 5xx; 4xx is the caller's fault and won't fix itself.
      if (status < 500 || attempt >= MAX_ATTEMPTS) {
        throw new Error(`${channel} send failed (${status}): ${lastError}`);
      }
    } catch (err) {
      clearTimeout(timer);
      const message = err.name === "AbortError" ? "timeout" : err.message;

      // If the throw came from our own !ok branch above, db row was already
      // written and we re-throw without double-logging.
      if (err.message?.startsWith(`${channel} send failed`)) {
        throw err;
      }

      if (db) {
        recordNotificationLog(db, {
          channel,
          payload,
          status: null,
          error: message,
          attempt
        });
      }

      lastStatus = null;
      lastError = message;

      if (attempt >= MAX_ATTEMPTS) {
        throw new Error(`${channel} send failed: ${message}`);
      }
    }
  }

  // Unreachable: loop either returns or throws on the final attempt.
  throw new Error(`${channel} send failed: ${lastError}`);
}

module.exports = {
  notifyWithRetry
};
