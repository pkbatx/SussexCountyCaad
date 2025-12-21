function parseUrl(req) {
  return new URL(req.url, `http://${req.headers.host}`);
}

function parseNumber(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseListFilters(req, { defaultLimit = 50, maxLimit = 500 } = {}) {
  const url = parseUrl(req);
  const limit = Math.min(
    parseNumber(url.searchParams.get("limit"), defaultLimit),
    maxLimit
  );

  return {
    start: url.searchParams.get("start") || undefined,
    end: url.searchParams.get("end") || undefined,
    incidentType: url.searchParams.get("incident_type") || undefined,
    jurisdiction: url.searchParams.get("jurisdiction") || undefined,
    status: url.searchParams.get("status") || undefined,
    minConfidence: parseNumber(url.searchParams.get("min_confidence"), undefined),
    limit,
    offset: parseNumber(url.searchParams.get("offset"), 0),
    cursor: url.searchParams.get("cursor") || undefined,
    q: url.searchParams.get("q") || undefined
  };
}

module.exports = {
  parseUrl,
  parseListFilters
};
