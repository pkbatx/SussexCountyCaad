const { listMapPoints } = require("../../db/queries/map");
const { parseListFilters, parseUrl } = require("./filters");

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapPointsHandler(req, res, { db }) {
  const url = parseUrl(req);
  const mode = url.searchParams.get("mode") || "markers";
  const entity = url.searchParams.get("entity") || "both";
  const filters = parseListFilters(req);
  const bounds = {
    minLat: parseNumber(url.searchParams.get("min_lat")),
    minLon: parseNumber(url.searchParams.get("min_lon")),
    maxLat: parseNumber(url.searchParams.get("max_lat")),
    maxLon: parseNumber(url.searchParams.get("max_lon"))
  };
  const hasBounds =
    bounds.minLat !== null &&
    bounds.minLon !== null &&
    bounds.maxLat !== null &&
    bounds.maxLon !== null;

  const points = listMapPoints(db, {
    entity,
    start: filters.start,
    end: filters.end,
    incidentType: filters.incidentType,
    jurisdiction: filters.jurisdiction,
    status: filters.status,
    minConfidence: filters.minConfidence,
    bounds: hasBounds ? bounds : null
  });

  const MAX_POINTS = 2000;
  const truncated = points.length > MAX_POINTS;
  const payload = {
    mode,
    points: truncated ? points.slice(0, MAX_POINTS) : points,
    truncated
  };

  sendJson(res, 200, payload);
}

module.exports = {
  mapPointsHandler
};
