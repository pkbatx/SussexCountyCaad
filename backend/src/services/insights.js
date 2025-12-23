const { createInsightMetric, clearInsightMetrics } = require("../db/queries/insights");

function appendAgencyClause(clauses, params, agency) {
  if (!agency) return;
  const agencies = Array.isArray(agency) ? agency : [agency];
  const normalized = agencies.map((value) => String(value).trim()).filter(Boolean);
  if (!normalized.length) return;
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

function buildCallFilter({ windowStart, windowEnd, filters = {} } = {}) {
  const clauses = [];
  const params = [];
  if (windowStart) {
    clauses.push("calls.first_seen_at >= ?");
    params.push(windowStart);
  }
  if (windowEnd) {
    clauses.push("calls.first_seen_at <= ?");
    params.push(windowEnd);
  }
  if (filters.status && filters.status !== "any") {
    clauses.push("calls.status = ?");
    params.push(filters.status);
  }
  if (filters.incidentType) {
    clauses.push("json_extract(meta.payload_json, '$.incident_type') = ?");
    params.push(filters.incidentType);
  }
  if (filters.jurisdiction) {
    clauses.push("json_extract(meta.payload_json, '$.jurisdiction') = ?");
    params.push(filters.jurisdiction);
  }
  appendAgencyClause(clauses, params, filters.agency);
  if (filters.serviceType) {
    const types = Array.isArray(filters.serviceType)
      ? filters.serviceType
      : [filters.serviceType];
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

  return {
    joins:
      "LEFT JOIN metadata_extracts meta ON meta.call_id = calls.call_id AND meta.created_at = (SELECT MAX(created_at) FROM metadata_extracts WHERE call_id = calls.call_id)",
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params
  };
}

function appendCondition(where, condition) {
  if (!condition) return where;
  if (!where) return `WHERE ${condition}`;
  return `${where} AND ${condition}`;
}

function refreshInsights(db, { windowStart, windowEnd, filters } = {}) {
  if (!db || !windowStart || !windowEnd) {
    return { created: 0 };
  }

  clearInsightMetrics(db, { windowStart, windowEnd });

  const callFilter = buildCallFilter({ windowStart, windowEnd, filters });
  const callWindowParams = callFilter.params;
  const baseJoin = callFilter.joins;
  const baseWhere = callFilter.where;
  const agencyRows = db
    .prepare(
      `SELECT agency_name as group_key, COUNT(1) as count FROM calls ${baseJoin} ${appendCondition(
        baseWhere,
        "agency_name IS NOT NULL AND agency_name != ''"
      )} GROUP BY agency_name`
    )
    .all(...callWindowParams);
  agencyRows.forEach((row) => {
    createInsightMetric(db, {
      metricType: "agency_calls",
      windowStart,
      windowEnd,
      groupKey: row.group_key,
      value: row.count
    });
  });

  const agencyReAlertRows = db
    .prepare(
      `SELECT agency_name as group_key, COUNT(1) as count FROM calls ${baseJoin} ${appendCondition(
        baseWhere,
        "re_alert_flag = 1 AND agency_name IS NOT NULL AND agency_name != ''"
      )} GROUP BY agency_name`
    )
    .all(...callWindowParams);
  agencyReAlertRows.forEach((row) => {
    createInsightMetric(db, {
      metricType: "agency_re_alerts",
      windowStart,
      windowEnd,
      groupKey: row.group_key,
      value: row.count
    });
  });

  const townRows = db
    .prepare(
      `SELECT COALESCE(json_extract(meta.payload_json, '$.city'), json_extract(meta.payload_json, '$.jurisdiction')) as group_key, COUNT(1) as count FROM calls ${baseJoin} ${appendCondition(
        baseWhere,
        "COALESCE(json_extract(meta.payload_json, '$.city'), json_extract(meta.payload_json, '$.jurisdiction')) IS NOT NULL AND COALESCE(json_extract(meta.payload_json, '$.city'), json_extract(meta.payload_json, '$.jurisdiction')) != ''"
      )} GROUP BY group_key`
    )
    .all(...callWindowParams);
  townRows.forEach((row) => {
    createInsightMetric(db, {
      metricType: "town_calls",
      windowStart,
      windowEnd,
      groupKey: row.group_key,
      value: row.count
    });
  });

  const created =
    agencyRows.length +
    agencyReAlertRows.length +
    townRows.length;

  return { created };
}

module.exports = {
  refreshInsights
};
