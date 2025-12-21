const crypto = require("crypto");

function createNotification(db, notification) {
  const notificationId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO notifications (notification_id, subject_type, subject_id, channel, routing_rule, dedupe_key, status, sent_at, error_detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    notificationId,
    notification.subjectType,
    notification.subjectId,
    notification.channel,
    notification.routingRule ?? null,
    notification.dedupeKey,
    notification.status,
    notification.sentAt ?? null,
    notification.errorDetail ?? null,
    createdAt
  );
  return notificationId;
}

function listNotifications(db, { subjectType, subjectId } = {}) {
  const clauses = [];
  const params = [];
  if (subjectType) {
    clauses.push("subject_type = ?");
    params.push(subjectType);
  }
  if (subjectId) {
    clauses.push("subject_id = ?");
    params.push(subjectId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(`SELECT * FROM notifications ${where} ORDER BY created_at DESC`)
    .all(...params);
}

function findRecentNotification(db, dedupeKey, windowStartIso) {
  return db
    .prepare(
      "SELECT * FROM notifications WHERE dedupe_key = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 1"
    )
    .get(dedupeKey, windowStartIso);
}

module.exports = {
  createNotification,
  listNotifications,
  findRecentNotification
};
