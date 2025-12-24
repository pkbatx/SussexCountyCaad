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

function buildCallFilterSql({
  start,
  end,
  status,
  incidentType,
  jurisdiction,
  minConfidence,
  agency,
  serviceType
}) {
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
  if (agency) {
    const agencies = Array.isArray(agency) ? agency : [agency];
    const normalized = agencies.map((value) => String(value).trim()).filter(Boolean);
    const unknownRequested = normalized.some(
      (value) => value.toLowerCase() === "unknown"
    );
    const named = normalized.filter((value) => value.toLowerCase() !== "unknown");
    const parts = [];
    if (named.length) {
      parts.push(`calls.agency_name IN (${named.map(() => "?").join(", ")})`);
      params.push(...named);
    }
    if (unknownRequested) {
      parts.push("(calls.agency_name IS NULL OR calls.agency_name = '')");
    }
    if (parts.length) {
      clauses.push(`(${parts.join(" OR ")})`);
    }
  }
  if (serviceType) {
    const types = Array.isArray(serviceType) ? serviceType : [serviceType];
    const normalized = types.map((value) => String(value).trim()).filter(Boolean);
    const unknownRequested = normalized.some(
      (value) => value.toLowerCase() === "unknown"
    );
    const named = normalized.filter((value) => value.toLowerCase() !== "unknown");
    const parts = [];
    if (named.length) {
      parts.push(`calls.service_type IN (${named.map(() => "?").join(", ")})`);
      params.push(...named);
    }
    if (unknownRequested) {
      parts.push("(calls.service_type IS NULL OR calls.service_type = '')");
    }
    if (parts.length) {
      clauses.push(`(${parts.join(" OR ")})`);
    }
  }
  if (typeof minConfidence === "number") {
    clauses.push("COALESCE(gd.confidence, 0) >= ?");
    params.push(minConfidence);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
    joins:
      "LEFT JOIN (SELECT call_id, CASE WHEN SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) > 0 THEN 'failed' WHEN SUM(CASE WHEN status IN ('running', 'pending', 'processing') THEN 1 ELSE 0 END) > 0 THEN 'processing' WHEN COUNT(*) > 0 THEN 'succeeded' ELSE NULL END as display_status FROM call_stages GROUP BY call_id) stage_status ON stage_status.call_id = calls.call_id LEFT JOIN metadata_extracts meta ON meta.call_id = calls.call_id AND meta.created_at = (SELECT MAX(created_at) FROM metadata_extracts WHERE call_id = calls.call_id) LEFT JOIN grouping_decisions gd ON gd.call_id = calls.call_id AND gd.created_at = (SELECT MAX(created_at) FROM grouping_decisions WHERE call_id = calls.call_id)"
  };
}

function getSummaryMetrics(db, filters = {}) {
  const callFilter = buildCallFilterSql(filters);
  const resolveWindowMinutes = Number.isFinite(filters.resolveWindowMinutes)
    ? filters.resolveWindowMinutes
    : 20;
  const now = Date.now();
  const totalCalls = db
    .prepare(`SELECT COUNT(1) as count FROM calls ${callFilter.joins} ${callFilter.where}`)
    .get(...callFilter.params).count;

  const activeCalls = db
    .prepare(
      `SELECT COUNT(1) as count FROM calls ${callFilter.joins} ${callFilter.where} ${callFilter.where ? "AND" : "WHERE"} COALESCE(stage_status.display_status, calls.status) IN ('processing', 'pending', 'running')`
    )
    .get(...callFilter.params).count;

  const resolvedCalls = db
    .prepare(
      `SELECT COUNT(1) as count FROM calls ${callFilter.joins} ${callFilter.where} ${callFilter.where ? "AND" : "WHERE"} COALESCE(stage_status.display_status, calls.status) IN ('succeeded', 'failed')`
    )
    .get(...callFilter.params).count;

  const pendingCalls = db
    .prepare(
      `SELECT COUNT(1) as count FROM calls ${callFilter.joins} ${callFilter.where} ${callFilter.where ? "AND" : "WHERE"} (gd.incident_id IS NULL OR gd.incident_id = '')`
    )
    .get(...callFilter.params).count;

  const reAlertCalls = db
    .prepare(
      `SELECT COUNT(1) as count FROM calls ${callFilter.joins} ${callFilter.where} ${callFilter.where ? "AND" : "WHERE"} calls.re_alert_flag = 1`
    )
    .get(...callFilter.params).count;

  const incidentResults = listIncidents(db, {
    start: filters.start,
    end: filters.end,
    incidentType: filters.incidentType,
    jurisdiction: filters.jurisdiction,
    status: filters.status,
    minConfidence: filters.minConfidence,
    agency: filters.agency,
    serviceType: filters.serviceType,
    limit: 1000,
    offset: 0
  });
  const incidentCounts = incidentResults.items.reduce(
    (acc, incident) => {
      const lastActivity =
        incident.last_activity_at ||
        incident.last_call_at ||
        incident.last_rollup_at ||
        incident.updated_at;
      if (!lastActivity) {
        acc.active += 1;
        return acc;
      }
      const timestamp = new Date(lastActivity).getTime();
      if (!Number.isFinite(timestamp)) {
        acc.active += 1;
        return acc;
      }
      const ageMinutes = (now - timestamp) / (1000 * 60);
      if (ageMinutes >= resolveWindowMinutes) {
        acc.resolved += 1;
      } else {
        acc.active += 1;
      }
      return acc;
    },
    { active: 0, resolved: 0 }
  );

  return {
    incident_count: incidentResults.total,
    incident_active_count: incidentCounts.active,
    incident_resolved_count: incidentCounts.resolved,
    call_count: totalCalls,
    pending_calls: pendingCalls,
    call_active_count: activeCalls,
    call_resolved_count: resolvedCalls,
    re_alert_calls: reAlertCalls
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
