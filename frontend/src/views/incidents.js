import { listIncidents } from "../api";

export async function renderIncidentsView({ onSelect }) {
  const container = document.createElement("div");
  container.className = "incidents-view";

  const { items } = await listIncidents();
  if (!items.length) {
    container.textContent = "No incidents yet.";
    return container;
  }

  const list = document.createElement("ul");
  list.className = "call-list";

  items.forEach((incident) => {
    const incidentId = incident.incident_id || incident.incidentId;
    const address = incident.normalized_address || "No address";
    const updatedAt = incident.last_rollup_at || incident.updated_at || "n/a";
    const memberCount = incident.member_count ?? 0;
    const summary = incident.latest_summary || "No rollup summary yet.";
    const confidence = incident.group_confidence ?? incident.groupConfidence ?? 0;
    const item = document.createElement("li");
    item.className = "call-item";
    item.innerHTML = `
      <div class="call-meta">
        <div class="call-id">${incidentId}</div>
        <div class="call-path">${address}</div>
        <div class="incident-summary">${summary}</div>
      </div>
      <div class="call-status">
        <div class="incident-updated">${updatedAt}</div>
        <div class="incident-meta">calls ${memberCount}</div>
        <div class="incident-meta">confidence ${confidence}</div>
      </div>
    `;
    item.addEventListener("click", () => onSelect(incidentId));
    list.appendChild(item);
  });

  container.appendChild(list);
  return container;
}
