const { getSummaryMetrics, getTrendBuckets, getHotspots } = require("../../db/queries/summaries");
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

function summaryMetricsHandler(req, res, { db }) {
  const filters = parseListFilters(req);
  const metrics = getSummaryMetrics(db, filters);
  sendJson(res, 200, metrics);
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
  summaryTrendsHandler,
  summaryHotspotsHandler
};
