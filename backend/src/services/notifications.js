const { recordNotificationLog } = require("../db/queries/notification_log");

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 2;

// 5xx and network/abort errors retry once; 4xx and other failures stop
// immediately. Every attempt writes a notification_log row. Throws on
// final failure so the notification stage's existing try/catch flows.
async function notifyWithRetry({ db, channel, payload, send, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await send(controller.signal);
    } catch (err) {
      clearTimeout(timer);
      const message = err.name === "AbortError" ? "timeout" : err.message;
      recordNotificationLog(db, { channel, payload, status: null, error: message, attempt });
      lastError = message;
      if (attempt >= MAX_ATTEMPTS) throw new Error(`${channel} send failed: ${message}`);
      continue;
    }
    clearTimeout(timer);

    const { status, ok } = response;
    let errorDetail = null;
    if (!ok) {
      try {
        errorDetail = (await response.text()).slice(0, 500);
      } catch (_err) {
        errorDetail = `HTTP ${status}`;
      }
    }
    recordNotificationLog(db, { channel, payload, status, error: errorDetail, attempt });

    if (ok) return { ok: true, status, attempt };

    lastError = errorDetail || `HTTP ${status}`;
    if (status < 500 || attempt >= MAX_ATTEMPTS) {
      throw new Error(`${channel} send failed (${status}): ${lastError}`);
    }
  }

  throw new Error(`${channel} send failed: ${lastError}`);
}

module.exports = { notifyWithRetry };
