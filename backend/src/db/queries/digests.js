const crypto = require("crypto");

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

function buildDigestFilter({ windowStart, windowEnd, filters = {} } = {}) {
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
  appendAgencyClause(clauses, params, filters.agency || filters.agencies);
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

function getLatestDigestSummary(db, { windowLabel } = {}) {
  if (!windowLabel) {
    return null;
  }
  return db
    .prepare(
      "SELECT * FROM digest_summaries WHERE window_label = ? ORDER BY created_at DESC LIMIT 1"
    )
    .get(windowLabel);
}

function createDigestSummary(
  db,
  { windowLabel, windowStart, windowEnd, callCountWindow, summaryText, summaryJson }
) {
  if (!windowLabel || !windowStart || !windowEnd) {
    return null;
  }
  const digestId = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO digest_summaries (digest_id, window_label, window_start, window_end, call_count_window, summary_text, summary_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    digestId,
    windowLabel,
    windowStart,
    windowEnd,
    callCountWindow ?? 0,
    summaryText || "",
    summaryJson || null,
    now,
    now
  );
  return db.prepare("SELECT * FROM digest_summaries WHERE digest_id = ?").get(digestId);
}

function countCallsInWindow(db, { windowStart, windowEnd, filters } = {}) {
  const filter = buildDigestFilter({ windowStart, windowEnd, filters });
  const row = db
    .prepare(`SELECT COUNT(1) as count FROM calls ${filter.joins} ${filter.where}`)
    .get(...filter.params);
  return row?.count ?? 0;
}

function listTownServiceCounts(db, { windowStart, windowEnd, filters, limit = 200 } = {}) {
  const filter = buildDigestFilter({ windowStart, windowEnd, filters });
  const where = appendCondition(
    filter.where,
    "COALESCE(json_extract(meta.payload_json, '$.city'), json_extract(meta.payload_json, '$.jurisdiction')) IS NOT NULL"
  );
  return db
    .prepare(
      `SELECT COALESCE(json_extract(meta.payload_json, '$.city'), json_extract(meta.payload_json, '$.jurisdiction')) as town, calls.service_type as service_type, calls.agency_name as agency_name, COUNT(1) as count FROM calls ${filter.joins} ${where} GROUP BY town, service_type, calls.agency_name ORDER BY count DESC LIMIT ?`
    )
    .all(...filter.params, limit);
}

function listDigestTranscripts(db, { windowStart, windowEnd, filters, limit = 50 } = {}) {
  const filter = buildDigestFilter({ windowStart, windowEnd, filters });
  const where = appendCondition(
    filter.where,
    "transcripts.text IS NOT NULL AND transcripts.text <> ''"
  );
  return db
    .prepare(
      `SELECT calls.call_id as call_id, calls.first_seen_at as first_seen_at, calls.agency_name as agency_name, calls.service_type as service_type, json_extract(meta.payload_json, '$.incident_type') as incident_type, COALESCE(json_extract(meta.payload_json, '$.city'), json_extract(meta.payload_json, '$.jurisdiction')) as town, json_extract(meta.payload_json, '$.address_normalized') as address, COALESCE(json_extract(meta.payload_json, '$.cross_street_1'), json_extract(meta.payload_json, '$.cross_street_2')) as cross_street, json_extract(meta.payload_json, '$.landmark') as poi, transcripts.text as transcript FROM calls ${filter.joins} LEFT JOIN transcripts ON transcripts.call_id = calls.call_id AND transcripts.created_at = (SELECT MAX(created_at) FROM transcripts WHERE call_id = calls.call_id) ${where} ORDER BY calls.first_seen_at DESC LIMIT ?`
    )
    .all(...filter.params, limit);
}

module.exports = {
  getLatestDigestSummary,
  createDigestSummary,
  countCallsInWindow,
  listTownServiceCounts,
  listDigestTranscripts
};
