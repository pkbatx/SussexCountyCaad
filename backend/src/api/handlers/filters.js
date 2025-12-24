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
  const pendingParam = url.searchParams.get("pending_incident");
  const pendingIncident =
    pendingParam === "1" ||
    pendingParam === "true" ||
    pendingParam === "yes";
  const agencyValues = url.searchParams.getAll("agency");
  const agencyFilter = agencyValues.length
    ? agencyValues
    : url.searchParams.get("agency") || undefined;
  const serviceValues = url.searchParams.getAll("service_type");
  const serviceFilter = serviceValues.length
    ? serviceValues
    : url.searchParams.get("service_type") || undefined;

  return {
    start: url.searchParams.get("start") || undefined,
    end: url.searchParams.get("end") || undefined,
    incidentType: url.searchParams.get("incident_type") || undefined,
    jurisdiction: url.searchParams.get("jurisdiction") || undefined,
    agency: agencyFilter,
    serviceType: serviceFilter,
    status: url.searchParams.get("status") || undefined,
    minConfidence: parseNumber(url.searchParams.get("min_confidence"), undefined),
    pendingIncident,
    activeWindowMinutes: parseNumber(
      url.searchParams.get("active_window_minutes"),
      undefined
    ),
    resolveWindowMinutes: parseNumber(
      url.searchParams.get("resolve_window_minutes"),
      undefined
    ),
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
