const crypto = require("crypto");

function recordNotificationLog(db, { channel, payload, status, error, attempt }) {
  const id = crypto.randomUUID();
  const payloadJson =
    typeof payload === "string" ? payload : JSON.stringify(payload || {});
  db.prepare(
    `INSERT INTO notification_log (id, channel, payload, status, error, attempt, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    channel,
    payloadJson,
    Number.isFinite(status) ? status : null,
    error || null,
    attempt || 1,
    new Date().toISOString()
  );
  return id;
}

function listNotificationLog(db, { limit, offset, channel } = {}) {
  const where = [];
  const params = [];
  if (channel) {
    where.push("channel = ?");
    params.push(channel);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const lim = Number.isFinite(limit) ? Math.min(limit, 500) : 50;
  const off = Number.isFinite(offset) ? Math.max(offset, 0) : 0;
  return db
    .prepare(
      `SELECT id, channel, payload, status, error, attempt, created_at
       FROM notification_log
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, lim, off);
}

module.exports = {
  recordNotificationLog,
  listNotificationLog
};
