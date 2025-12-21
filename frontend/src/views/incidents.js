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
    const item = document.createElement("li");
    item.className = "call-item";
    item.innerHTML = `
      <div class="call-meta">
        <div class="call-id">${incident.incident_id || incident.incidentId}</div>
        <div class="call-path">${incident.normalized_address || "No address"}</div>
      </div>
      <div class="call-status">${incident.group_confidence ?? incident.groupConfidence}</div>
    `;
    item.addEventListener("click", () => onSelect(incident.incident_id || incident.incidentId));
    list.appendChild(item);
  });

  container.appendChild(list);
  return container;
}
