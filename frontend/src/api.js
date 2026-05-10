import { serializeFilters } from "./state/filters";
import { AUTO_RESOLVE_MINUTES } from "./config";

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

export function fetchIncidentTimeline(incidentId) {
  return fetchJson(`/api/incidents/${incidentId}/timeline`);
}

export function fetchTimelineTranscript(eventId) {
  return fetchJson(`/api/timeline/${encodeURIComponent(eventId)}/transcript`);
}

export function fetchSummaryEvidence(statementId) {
  return fetchJson(`/api/summary/${encodeURIComponent(statementId)}/evidence`);
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
  params.set("resolve_window_minutes", String(AUTO_RESOLVE_MINUTES));
  return fetchJson(`/api/summary?${params.toString()}`).then((data) => ({
    ...data,
    windowStart: data.window_start ?? data.windowStart ?? filters?.start ?? null,
    windowEnd: data.window_end ?? data.windowEnd ?? filters?.end ?? null
  }));
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
  return fetchJson(query ? `/api/summary/digests?${query}` : "/api/summary/digests").then(
    (data) => ({
      ...data,
      digests: (data?.digests || []).map((digest) => ({
        ...digest,
        entries: Array.isArray(digest.entries) ? digest.entries : []
      }))
    })
  );
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

export function listSignals({ callId, stage, signal, limit, offset } = {}) {
  const params = new URLSearchParams();
  if (callId) params.set("call_id", callId);
  if (stage) params.set("stage", stage);
  if (signal) params.set("signal", signal);
  if (Number.isFinite(limit)) params.set("limit", String(limit));
  if (Number.isFinite(offset)) params.set("offset", String(offset));
  const query = params.toString();
  return fetchJson(query ? `/api/signals?${query}` : "/api/signals");
}

export function listNotificationLog({ limit = 50, offset = 0, channel } = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (channel) params.set("channel", channel);
  return fetchJson(`/api/notifications/log?${params.toString()}`);
}
