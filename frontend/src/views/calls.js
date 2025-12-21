import { listCalls } from "../api";

function formatTimestamp(value) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export async function renderCallsView({ onSelect, filters }) {
  const container = document.createElement("div");
  container.className = "calls-view";

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
    items.forEach((call) => {
      const item = document.createElement("li");
      item.className = "call-item";
      const statusValue = call.status || "unknown";
      const location =
        call.address_normalized || call.address_raw || "Location unknown";
      const metaLine = [call.incident_type, call.jurisdiction]
        .filter(Boolean)
        .join(" · ");
      item.innerHTML = `
        <div class="call-meta">
          <div class="call-id">${call.call_id || call.callId}</div>
          <div class="call-path">${location}</div>
          <div class="incident-meta">${metaLine || "No classification yet"}</div>
          <div class="incident-updated">${formatTimestamp(
            call.first_seen_at || call.created_at
          )}</div>
        </div>
        <div class="call-status">
          <span class="status-badge status-${statusValue}">${statusValue}</span>
        </div>
      `;
      item.addEventListener("click", () => onSelect(call.call_id || call.callId));
      list.appendChild(item);
    });
  };

  const updateFooter = () => {
    if (!total && offset === 0) {
      status.textContent = "No calls match the current filters.";
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
      const result = await listCalls({ filters, limit, offset });
      total = result.total ?? 0;
      if (offset === 0 && result.items.length === 0) {
        updateFooter();
        return;
      }
      appendItems(result.items);
      offset += result.items.length;
      updateFooter();
    } catch (error) {
      status.textContent = `Failed to load calls: ${error.message}`;
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
