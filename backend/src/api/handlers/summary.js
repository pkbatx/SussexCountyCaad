const { getSummaryMetrics, getTrendBuckets, getHotspots } = require("../../db/queries/summaries");
const { listInsightMetrics } = require("../../db/queries/insights");
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
    total_calls: metrics.total_calls ?? 0,
    active_incidents: metrics.active_incidents ?? 0,
    high_priority_calls: metrics.high_priority_calls ?? 0,
    re_alert_calls: metrics.re_alert_calls ?? 0
  };
}

function summaryMetricsHandler(req, res, { db }) {
  const filters = parseListFilters(req);
  const metrics = getSummaryMetrics(db, filters);
  sendJson(res, 200, normalizeSummaryMetrics(metrics));
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
    sendJson(res, 200, { digests });
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

module.exports = {
  summaryMetricsHandler,
  summaryInsightsHandler,
  summaryDigestHandler,
  summaryTrendsHandler,
  summaryHotspotsHandler
};
