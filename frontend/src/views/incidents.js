import { listIncidents } from "../api";

function formatTimestamp(value) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export async function renderIncidentsView({ onSelect, filters }) {
  const container = document.createElement("div");
  container.className = "incidents-view";

  const list = document.createElement("ul");
  list.className = "call-list";
  container.appendChild(list);

  const status = document.createElement("div");
  status.className = "empty-state";
  container.appendChild(status);

  const loadMore = document.createElement("button");
  loadMore.className = "button small";
  loadMore.textContent = "Load more";
  loadMore.style.display = "none";
  container.appendChild(loadMore);

  const limit = 50;
  let offset = 0;
  let total = 0;

  const appendItems = (items) => {
    items.forEach((incident) => {
      const incidentId = incident.incident_id || incident.incidentId;
      const address = incident.normalized_address || "No address";
      const updatedAt = incident.last_rollup_at || incident.updated_at || "n/a";
      const memberCount = incident.member_count ?? 0;
      const summary = incident.latest_summary || "No rollup summary yet.";
      const confidence = incident.group_confidence ?? incident.groupConfidence ?? 0;
      const statusValue = incident.status || "active";
      const metaLine = [incident.incident_type, incident.jurisdiction]
        .filter(Boolean)
        .join(" · ");
      const item = document.createElement("li");
      item.className = "call-item";
      item.innerHTML = `
        <div class="call-meta">
          <div class="call-id">${incidentId}</div>
          <div class="call-path">${address}</div>
          <div class="incident-summary">${summary}</div>
          <div class="incident-meta">${metaLine || "No classification yet"}</div>
        </div>
        <div class="call-status">
          <span class="status-badge status-${statusValue}">${statusValue}</span>
          <div class="incident-updated">${formatTimestamp(updatedAt)}</div>
          <div class="incident-meta">calls ${memberCount}</div>
          <div class="incident-meta">confidence ${confidence}</div>
        </div>
      `;
      item.addEventListener("click", () => onSelect(incidentId));
      list.appendChild(item);
    });
  };

  const updateFooter = () => {
    if (!total && offset === 0) {
      status.textContent = "No incidents match the current filters.";
      status.style.display = "block";
      loadMore.style.display = "none";
      return;
    }
    status.textContent = "";
    status.style.display = "none";
    loadMore.style.display = offset < total ? "inline-flex" : "none";
  };

  const loadPage = async () => {
    loadMore.disabled = true;
    try {
      const result = await listIncidents({ filters, limit, offset });
      total = result.total ?? 0;
      if (offset === 0 && result.items.length === 0) {
        updateFooter();
        return;
      }
      appendItems(result.items);
      offset += result.items.length;
      updateFooter();
    } catch (error) {
      status.textContent = `Failed to load incidents: ${error.message}`;
      status.style.display = "block";
      loadMore.style.display = "none";
    } finally {
      loadMore.disabled = false;
    }
  };

  loadMore.addEventListener("click", loadPage);

  await loadPage();

  return container;
}
