const {
  getSummaryMetrics,
  getLatestCall,
  getTrendBuckets,
  getHotspots
} = require("../../db/queries/summaries");
const { listInsightMetrics } = require("../../db/queries/insights");
const { getRollupById } = require("../../db/queries/rollups");
const { listTranscriptsForCall } = require("../../db/queries/timeline");
const { refreshInsights } = require("../../services/insights");
const { getDigestSummaries } = require("../../services/digest");
const { parseListFilters, parseUrl } = require("./filters");

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function parseNumber(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveWindow(filters) {
  const end = filters.end ? new Date(filters.end) : new Date();
  const start = filters.start
    ? new Date(filters.start)
    : new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return {
    windowStart: start.toISOString(),
    windowEnd: end.toISOString()
  };
}

function normalizeSummaryMetrics(metrics) {
  return {
    incident_count: metrics.incident_count ?? 0,
    incident_active_count: metrics.incident_active_count ?? 0,
    incident_resolved_count: metrics.incident_resolved_count ?? 0,
    call_count: metrics.call_count ?? 0,
    pending_calls: metrics.pending_calls ?? 0,
    call_active_count: metrics.call_active_count ?? 0,
    call_resolved_count: metrics.call_resolved_count ?? 0,
    re_alert_calls: metrics.re_alert_calls ?? 0
  };
}

function summaryMetricsHandler(req, res, { db }) {
  const filters = parseListFilters(req);
  const metrics = getSummaryMetrics(db, filters);
  const latestCall = getLatestCall(db, {});
  const { windowStart, windowEnd } = resolveWindow(filters);
  sendJson(res, 200, {
    ...normalizeSummaryMetrics(metrics),
    latest_call_source: latestCall?.source_path ?? null,
    latest_call_seen_at: latestCall?.first_seen_at ?? null,
    window_start: windowStart,
    window_end: windowEnd
  });
}

function summaryInsightsHandler(req, res, { db }) {
  const url = parseUrl(req);
  const filters = parseListFilters(req);
  const limit = parseNumber(url.searchParams.get("limit"), 10);
  const { windowStart, windowEnd } = resolveWindow(filters);

  refreshInsights(db, { windowStart, windowEnd, filters });

  const metrics = {
    agency_calls: listInsightMetrics(db, {
      metricType: "agency_calls",
      windowStart,
      windowEnd,
      limit
    }),
    agency_re_alerts: listInsightMetrics(db, {
      metricType: "agency_re_alerts",
      windowStart,
      windowEnd,
      limit
    }),
    town_calls: listInsightMetrics(db, {
      metricType: "town_calls",
      windowStart,
      windowEnd,
      limit
    })
  };

  sendJson(res, 200, {
    window_start: windowStart,
    window_end: windowEnd,
    metrics
  });
}

async function summaryDigestHandler(req, res, { db, config }) {
  const filters = parseListFilters(req);
  try {
    const digests = await getDigestSummaries(db, config, filters);
    const normalized = (digests || []).map((digest) => {
      let payload = {};
      if (digest.summary_json) {
        try {
          payload = JSON.parse(digest.summary_json);
        } catch (_error) {
          payload = {};
        }
      }
      const lines =
        Array.isArray(payload.lines) && payload.lines.length
          ? payload.lines
          : digest.summary_text
          ? digest.summary_text.split("\n")
          : [];
      const entries =
        Array.isArray(payload.entries) && payload.entries.length
          ? payload.entries
          : lines.map((line) => ({ summary: line }));
      return {
        window_label: digest.window_label,
        window_start: digest.window_start,
        window_end: digest.window_end,
        updated_at: digest.created_at ?? digest.updated_at ?? null,
        total_incidents: payload.total_incidents ?? digest.call_count_window ?? 0,
        detail_level: payload.detail_level ?? null,
        entries
      };
    });
    sendJson(res, 200, { digests: normalized });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Digest unavailable" });
  }
}

function summaryTrendsHandler(req, res, { db }) {
  const url = parseUrl(req);
  const bucketMinutes = parseNumber(url.searchParams.get("bucket_minutes"), 60);
  const filters = parseListFilters(req);
  const buckets = getTrendBuckets(db, {
    start: filters.start,
    end: filters.end,
    bucketMinutes,
    incidentType: filters.incidentType,
    jurisdiction: filters.jurisdiction,
    status: filters.status,
    minConfidence: filters.minConfidence
  });
  sendJson(res, 200, buckets);
}

function summaryHotspotsHandler(req, res, { db }) {
  const url = parseUrl(req);
  const hotspotType = url.searchParams.get("hotspot_type") || "any";
  const limit = parseNumber(url.searchParams.get("limit"), 10);
  const filters = parseListFilters(req);
  const hotspots = getHotspots(db, {
    start: filters.start,
    end: filters.end,
    hotspotType,
    limit,
    incidentType: filters.incidentType,
    jurisdiction: filters.jurisdiction,
    status: filters.status,
    minConfidence: filters.minConfidence
  });
  sendJson(res, 200, hotspots);
}

function parseStatementId(statementId) {
  const decoded = decodeURIComponent(String(statementId || ""));
  const parts = decoded.split(":");
  if (parts[0] !== "rollup" || parts.length < 2) {
    return null;
  }
  return {
    rollupId: parts[1],
    lineIndex: parts[3] ? Number(parts[3]) : null
  };
}

function summaryEvidenceHandler(req, res, { db, statementId }) {
  const parsed = parseStatementId(statementId);
  if (!parsed) {
    return sendJson(res, 400, { error: "invalid_statement_id" });
  }
  const rollup = getRollupById(db, parsed.rollupId);
  if (!rollup) {
    return sendJson(res, 404, { error: "summary_not_found" });
  }
  const callIds = Array.isArray(rollup.included_call_ids)
    ? rollup.included_call_ids
    : [];
  const evidence = callIds.flatMap((callId) => {
    const transcripts = listTranscriptsForCall(db, callId);
    return transcripts.map((transcript) => ({
      call_id: callId,
      transcript_id: transcript.transcript_id,
      created_at: transcript.created_at,
      text: transcript.text,
      confidence: transcript.confidence ?? null
    }));
  });
  return sendJson(res, 200, {
    statement_id: statementId,
    rollup_id: rollup.rollup_id,
    evidence
  });
}

module.exports = {
  summaryMetricsHandler,
  summaryInsightsHandler,
  summaryDigestHandler,
  summaryTrendsHandler,
  summaryHotspotsHandler,
  summaryEvidenceHandler
};
