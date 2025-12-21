async function fetchJson(path, options = {}) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  return response.json();
}

export function listCalls() {
  return fetchJson("/api/calls");
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

export function listIncidents() {
  return fetchJson("/api/incidents");
}

export function getIncidentDetail(incidentId) {
  return fetchJson(`/api/incidents/${incidentId}`);
}

export function listNotifications() {
  return fetchJson("/api/notifications");
}
