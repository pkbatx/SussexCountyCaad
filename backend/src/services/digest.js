const {
  getLatestDigestSummary,
  createDigestSummary,
  countIncidentsInWindow,
  listIncidentDigestEntries
} = require("../db/queries/digests");

const WINDOW_DEFINITIONS = [
  { label: "24h", hours: 24, maxLines: 8, detailLevel: "detailed" },
  { label: "7d", hours: 24 * 7, maxLines: 5, detailLevel: "summary" },
  { label: "30d", hours: 24 * 30, maxLines: 4, detailLevel: "overview" }
];

function toWindowRange(hours) {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return { windowStart: start.toISOString(), windowEnd: end.toISOString() };
}

function shouldRefresh({
  latest,
  incidentCount,
  refreshHours,
  refreshIncidentThreshold
}) {
  if (!latest) return true;
  if (!latest.summary_text || latest.summary_text.trim() === "") {
    return true;
  }
  if (latest.summary_json) {
    try {
      const payload = JSON.parse(latest.summary_json);
      const hasEntries = Array.isArray(payload.entries);
      const hasLines = Array.isArray(payload.lines);
      if (hasLines && !hasEntries) {
        return true;
      }
      if (hasEntries) {
        if (payload.entries.length === 0 && incidentCount > 0) {
          return true;
        }
        const missingIncidentIds = payload.entries.some(
          (entry) => !entry || !entry.incident_id
        );
        if (missingIncidentIds && incidentCount > 0) {
          return true;
        }
      }
    } catch (_error) {
      return true;
    }
  }
  const lastCreated = new Date(latest.created_at || latest.updated_at || 0);
  const ageHours = (Date.now() - lastCreated.getTime()) / (60 * 60 * 1000);
  if (Number.isFinite(refreshHours) && ageHours >= refreshHours) {
    return true;
  }
  if (
    Number.isFinite(refreshIncidentThreshold) &&
    incidentCount - (latest.call_count_window || 0) >= refreshIncidentThreshold
  ) {
    return true;
  }
  return false;
}

function buildIncidentEntry(row) {
  let keyFields = {};
  if (row?.key_fields_json) {
    try {
      keyFields = JSON.parse(row.key_fields_json);
    } catch (_error) {
      keyFields = {};
    }
  }
  const normalizedAddress = row?.normalized_address || null;
  const resolvedAddress = row.address || keyFields.address || normalizedAddress || null;
  const resolvedTown = row.town || keyFields.town || null;
  return {
    incident_id: row.incident_id,
    summary: row.summary_text || keyFields.summary || "",
    agency: row.agency || keyFields.agency || null,
    incident_type: row.incident_type || keyFields.incident_type || null,
    address: resolvedAddress,
    town: resolvedTown,
    cross_street: row.cross_street || keyFields.cross_street || null,
    poi: row.poi || keyFields.poi || null,
    status: row.status || keyFields.status || null,
    updated_at: row.created_at || null,
    call_count: row.call_count ?? null,
    re_alert_count: row.re_alert_count ?? 0
  };
}

function buildDigestLines(entries) {
  return entries.map((entry) => {
    const label = entry.agency || entry.incident_type || "Incident";
    const summary = entry.summary || [entry.address, entry.town].filter(Boolean).join(" · ");
    if (!summary) {
      return label;
    }
    return `${label} — ${summary}`;
  });
}

async function buildDigest({ db, config, windowLabel, windowStart, windowEnd, maxLines, detailLevel, filters }) {
  const incidentCount = countIncidentsInWindow(db, { windowStart, windowEnd, filters });
  const latest = getLatestDigestSummary(db, { windowLabel });
  const refreshHours = config.digestRefreshHours || 2;
  const refreshIncidentThreshold = config.digestRefreshCallThreshold || 5;

  if (
    !shouldRefresh({
      latest,
      incidentCount,
      refreshHours,
      refreshIncidentThreshold
    })
  ) {
    return latest;
  }

  const rows = listIncidentDigestEntries(db, {
    windowStart,
    windowEnd,
    filters,
    limit: Math.max(maxLines, 1)
  });
  const entries = rows.map(buildIncidentEntry).slice(0, maxLines);
  const summaryLines = buildDigestLines(entries);

  return createDigestSummary(db, {
    windowLabel,
    windowStart,
    windowEnd,
    callCountWindow: incidentCount,
    summaryText: summaryLines.join("\n"),
    summaryJson: JSON.stringify({
      entries,
      lines: summaryLines,
      total_incidents: incidentCount,
      detail_level: detailLevel
    })
  });
}

async function getDigestSummaries(db, config, filters = {}) {
  const sanitizedFilters = { ...filters };
  delete sanitizedFilters.start;
  delete sanitizedFilters.end;

  const results = [];
  for (const definition of WINDOW_DEFINITIONS) {
    const range = toWindowRange(definition.hours);
    const digest = await buildDigest({
      db,
      config,
      windowLabel: definition.label,
      windowStart: range.windowStart,
      windowEnd: range.windowEnd,
      maxLines: definition.maxLines,
      detailLevel: definition.detailLevel,
      filters: sanitizedFilters
    });
    if (digest) {
      results.push(digest);
    }
  }
  return results;
}

module.exports = {
  getDigestSummaries
};
