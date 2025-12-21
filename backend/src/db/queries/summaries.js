const crypto = require("crypto");
const { listIncidents } = require("./incidents");

function nextSummaryVersion(db, subjectType, subjectId) {
  const row = db
    .prepare(
      "SELECT MAX(version) as max_version FROM summaries WHERE subject_type = ? AND subject_id = ?"
    )
    .get(subjectType, subjectId);
  return (row?.max_version || 0) + 1;
}

function createSummary(db, { subjectType, subjectId, runId, summaryText }) {
  const summaryId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const version = nextSummaryVersion(db, subjectType, subjectId);

  db.prepare(
    "INSERT INTO summaries (summary_id, subject_type, subject_id, run_id, summary_text, created_at, version) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(summaryId, subjectType, subjectId, runId, summaryText, createdAt, version);

  return summaryId;
}

function listSummariesForCall(db, callId) {
  return db
    .prepare(
      "SELECT * FROM summaries WHERE subject_type = 'call' AND subject_id = ? ORDER BY version DESC"
    )
    .all(callId);
}

function listSummariesForIncident(db, incidentId) {
  return db
    .prepare(
      "SELECT * FROM summaries WHERE subject_type = 'incident' AND subject_id = ? ORDER BY version DESC"
    )
    .all(incidentId);
}

function buildCallFilterSql({ start, end, status, incidentType, jurisdiction, minConfidence }) {
  const clauses = [];
  const params = [];
  if (status && status !== "any") {
    clauses.push("calls.status = ?");
    params.push(status);
  }
  if (start) {
    clauses.push("calls.first_seen_at >= ?");
    params.push(start);
  }
  if (end) {
    clauses.push("calls.first_seen_at <= ?");
    params.push(end);
  }
  if (incidentType) {
    clauses.push("json_extract(meta.payload_json, '$.incident_type') = ?");
    params.push(incidentType);
  }
  if (jurisdiction) {
    clauses.push("json_extract(meta.payload_json, '$.jurisdiction') = ?");
    params.push(jurisdiction);
  }
  if (typeof minConfidence === "number") {
    clauses.push("COALESCE(gd.confidence, 0) >= ?");
    params.push(minConfidence);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
    joins:
      "LEFT JOIN metadata_extracts meta ON meta.call_id = calls.call_id AND meta.created_at = (SELECT MAX(created_at) FROM metadata_extracts WHERE call_id = calls.call_id) LEFT JOIN grouping_decisions gd ON gd.call_id = calls.call_id AND gd.created_at = (SELECT MAX(created_at) FROM grouping_decisions WHERE call_id = calls.call_id)"
  };
}

function getSummaryMetrics(db, filters = {}) {
  const callFilter = buildCallFilterSql(filters);
  const totalCalls = db
    .prepare(`SELECT COUNT(1) as count FROM calls ${callFilter.joins} ${callFilter.where}`)
    .get(...callFilter.params).count;

  const highPriority = db
    .prepare(
      `SELECT COUNT(1) as count FROM calls ${callFilter.joins} ${callFilter.where} ${callFilter.where ? "AND" : "WHERE"} LOWER(json_extract(meta.payload_json, '$.priority')) IN ('high', 'urgent', 'p1', 'priority 1')`
    )
    .get(...callFilter.params).count;

  const failedStages = db
    .prepare(
      `SELECT COUNT(1) as count FROM call_stages cs JOIN calls ON cs.call_id = calls.call_id ${callFilter.joins} ${callFilter.where} ${callFilter.where ? "AND" : "WHERE"} cs.status = 'failed'`
    )
    .get(...callFilter.params).count;

  const incidentsTotal = listIncidents(db, {
    start: filters.start,
    end: filters.end,
    incidentType: filters.incidentType,
    jurisdiction: filters.jurisdiction,
    status: filters.status,
    minConfidence: filters.minConfidence,
    limit: 1,
    offset: 0
  }).total;

  const notificationClauses = [];
  const notificationParams = [];
  if (filters.start) {
    notificationClauses.push("created_at >= ?");
    notificationParams.push(filters.start);
  }
  if (filters.end) {
    notificationClauses.push("created_at <= ?");
    notificationParams.push(filters.end);
  }
  const notificationWhere = notificationClauses.length
    ? `WHERE ${notificationClauses.join(" AND ")}`
    : "";
  const notificationsSent = db
    .prepare(
      `SELECT COUNT(1) as count FROM notifications ${notificationWhere} ${notificationWhere ? "AND" : "WHERE"} status = 'sent'`
    )
    .get(...notificationParams).count;

  return {
    total_calls: totalCalls,
    active_incidents: incidentsTotal,
    high_priority_calls: highPriority,
    failed_stages: failedStages,
    notifications_sent: notificationsSent
  };
}

function getTrendBuckets(db, { start, end, bucketMinutes = 60, ...filters } = {}) {
  const windowEnd = end ? new Date(end) : new Date();
  const windowStart = start
    ? new Date(start)
    : new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000);
  const bucketMs = bucketMinutes * 60 * 1000;

  const callFilter = buildCallFilterSql({ ...filters, start: windowStart.toISOString(), end: windowEnd.toISOString() });
  const rows = db
    .prepare(
      `SELECT calls.first_seen_at FROM calls ${callFilter.joins} ${callFilter.where}`
    )
    .all(...callFilter.params);

  const buckets = new Map();
  const startMs = windowStart.getTime();
  const endMs = windowEnd.getTime();

  for (let t = startMs; t <= endMs; t += bucketMs) {
    const key = t;
    buckets.set(key, 0);
  }

  rows.forEach((row) => {
    const ts = new Date(row.first_seen_at).getTime();
    if (!Number.isFinite(ts)) return;
    const bucket = Math.floor((ts - startMs) / bucketMs) * bucketMs + startMs;
    if (buckets.has(bucket)) {
      buckets.set(bucket, buckets.get(bucket) + 1);
    }
  });

  return Array.from(buckets.entries()).map(([bucketStart, count]) => ({
    bucket_start: new Date(bucketStart).toISOString(),
    bucket_end: new Date(bucketStart + bucketMs).toISOString(),
    call_count: count
  }));
}

function getHotspots(db, { start, end, hotspotType = "any", limit = 10, ...filters } = {}) {
  const callFilter = buildCallFilterSql({ ...filters, start, end });
  const rows = db
    .prepare(
      `SELECT meta.payload_json FROM calls ${callFilter.joins} ${callFilter.where}`
    )
    .all(...callFilter.params);

  const counts = new Map();
  rows.forEach((row) => {
    if (!row.payload_json) return;
    let payload;
    try {
      payload = JSON.parse(row.payload_json);
    } catch (_error) {
      return;
    }
    const buckets = [];
    if (hotspotType === "town" || hotspotType === "any") {
      if (payload.city) buckets.push({ type: "town", label: payload.city });
    }
    if (hotspotType === "street" || hotspotType === "any") {
      if (payload.address_normalized) {
        buckets.push({ type: "street", label: payload.address_normalized });
      }
    }
    if (hotspotType === "poi" || hotspotType === "any") {
      if (payload.landmark) buckets.push({ type: "poi", label: payload.landmark });
    }

    buckets.forEach((entry) => {
      const key = `${entry.type}::${entry.label}`;
      counts.set(key, { ...entry, count: (counts.get(key)?.count || 0) + 1 });
    });
  });

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((entry) => ({
      hotspot_type: entry.type,
      label: entry.label,
      count: entry.count,
      latitude: null,
      longitude: null
    }));
}

module.exports = {
  createSummary,
  listSummariesForCall,
  listSummariesForIncident,
  getSummaryMetrics,
  getTrendBuckets,
  getHotspots
};
