import { serializeFilters } from "./views/filters";

async function fetchJson(path, options = {}) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  return response.json();
}

function buildListUrl(basePath, { filters, limit, offset, cursor, q } = {}) {
  const params = serializeFilters(filters || {});
  if (typeof limit === "number") params.set("limit", String(limit));
  if (typeof offset === "number") params.set("offset", String(offset));
  if (cursor) params.set("cursor", cursor);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function listCalls(options = {}) {
  return fetchJson(buildListUrl("/api/calls", options));
}

export function getCallDetail(callId) {
  return fetchJson(`/api/calls/${callId}`);
}

export function retryStage(callId, stage) {
  return fetchJson(`/api/calls/${callId}/retry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage })
  });
}

export function listIncidents(options = {}) {
  return fetchJson(buildListUrl("/api/incidents", options));
}

export function getIncidentDetail(incidentId) {
  return fetchJson(`/api/incidents/${incidentId}`);
}

export function listAgencies({ filters, q } = {}) {
  const params = new URLSearchParams();
  if (filters?.start) params.set("start", filters.start);
  if (filters?.end) params.set("end", filters.end);
  if (q) params.set("q", q);
  const query = params.toString();
  return fetchJson(query ? `/api/agencies?${query}` : "/api/agencies");
}

export function listNotifications() {
  return fetchJson("/api/notifications");
}

export function fetchMapPoints({ filters, mode = "markers", entity = "both" } = {}) {
  const params = serializeFilters(filters || {});
  params.set("mode", mode);
  params.set("entity", entity);
  return fetchJson(`/api/map/points?${params.toString()}`);
}

export function fetchSummaryMetrics({ filters } = {}) {
  const params = serializeFilters(filters || {});
  return fetchJson(`/api/summary?${params.toString()}`);
}

export function fetchTrendBuckets({ filters, bucketMinutes = 60 } = {}) {
  const params = serializeFilters(filters || {});
  params.set("bucket_minutes", String(bucketMinutes));
  return fetchJson(`/api/summary/trends?${params.toString()}`);
}

export function fetchHotspots({ filters, hotspotType = "any", limit = 10 } = {}) {
  const params = serializeFilters(filters || {});
  params.set("hotspot_type", hotspotType);
  params.set("limit", String(limit));
  return fetchJson(`/api/summary/hotspots?${params.toString()}`);
}

export function fetchInsights({ filters, limit = 10 } = {}) {
  const params = serializeFilters(filters || {});
  params.set("limit", String(limit));
  return fetchJson(`/api/summary/insights?${params.toString()}`);
}

export function fetchDigestSummaries({ filters } = {}) {
  const params = serializeFilters(filters || {});
  const query = params.toString();
  return fetchJson(query ? `/api/summary/digests?${query}` : "/api/summary/digests");
}

export function submitCallFeedback(callId, payload) {
  return fetchJson(`/api/feedback/calls/${callId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function listCallFeedback(callId) {
  return fetchJson(`/api/feedback/calls/${callId}`);
}

export function submitIncidentFeedback(incidentId, payload) {
  return fetchJson(`/api/feedback/incidents/${incidentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function listIncidentFeedback(incidentId) {
  return fetchJson(`/api/feedback/incidents/${incidentId}`);
}
