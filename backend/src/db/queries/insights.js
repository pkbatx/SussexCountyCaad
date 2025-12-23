const crypto = require("crypto");

function clearInsightMetrics(db, { windowStart, windowEnd } = {}) {
  if (!windowStart || !windowEnd) {
    return 0;
  }
  const result = db
    .prepare("DELETE FROM insight_metrics WHERE window_start = ? AND window_end = ?")
    .run(windowStart, windowEnd);
  return result.changes || 0;
}

function createInsightMetric(db, { metricType, windowStart, windowEnd, groupKey, value } = {}) {
  if (!metricType || !windowStart || !windowEnd) {
    return null;
  }
  const metricId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO insight_metrics (metric_id, window_start, window_end, metric_type, group_key, value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(metricId, windowStart, windowEnd, metricType, groupKey ?? null, value ?? 0, createdAt);
  return metricId;
}

function listInsightMetrics(db, { metricType, windowStart, windowEnd, limit = 100 } = {}) {
  const clauses = [];
  const params = [];
  if (metricType) {
    clauses.push("metric_type = ?");
    params.push(metricType);
  }
  if (windowStart) {
    clauses.push("window_start = ?");
    params.push(windowStart);
  }
  if (windowEnd) {
    clauses.push("window_end = ?");
    params.push(windowEnd);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(`SELECT * FROM insight_metrics ${where} ORDER BY value DESC LIMIT ?`)
    .all(...params, limit);
}

module.exports = {
  clearInsightMetrics,
  createInsightMetric,
  listInsightMetrics
};
