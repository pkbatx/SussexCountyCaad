import { listCalls } from "../api";

function formatTimestamp(value) {
  if (!value) return { text: "Unknown time", title: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { text: value, title: "" };
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  let text = "Just now";
  if (diffSeconds >= 60) {
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      text = `${diffMinutes}m ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) {
        text = `${diffHours}h ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        text = `${diffDays}d ago`;
      }
    }
  }
  return { text, title: date.toLocaleString() };
}

export async function renderCallsView({ onSelect, onPlay, filters }) {
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
      item.className = "cad-card";
      const statusValue = (() => {
        if (call.status === "processing" || call.status === "pending") {
          return "active";
        }
        return call.status || "unknown";
      })();
      const agency = call.agency || "Unknown";
      const serviceType = call.service_type ? ` · ${call.service_type}` : "";
      const location = call.address || call.town || "Location unknown";
      const metaLine = [agency, call.incident_type]
        .filter(Boolean)
        .join(" · ");
      const incidentLabel = call.incident_linked ? "Linked to incident" : "Unlinked";
      const timestamp = formatTimestamp(call.first_seen_at || call.created_at);
      const serviceClass = call.service_type
        ? call.service_type.toLowerCase()
        : "unknown";
      item.dataset.service = serviceClass;
      const typeBadge = call.service_type
        ? `<span class="type-pill type-${serviceClass}">${call.service_type}</span>`
        : "";
      item.innerHTML = `
        <div class="cad-card-main">
          <div class="cad-card-title">${location}</div>
          <div class="cad-card-meta">${metaLine || "Unspecified"} ${typeBadge}</div>
          <div class="cad-card-meta">${agency}${serviceType}</div>
          <div class="cad-card-meta">${incidentLabel}</div>
          <div class="incident-updated" title="${timestamp.title}">${timestamp.text}</div>
        </div>
        <div class="cad-card-status">
          <span class="status-badge status-${statusValue}">${statusValue}</span>
          <button class="button small call-play">Play</button>
        </div>
      `;
      const playButton = item.querySelector(".call-play");
      if (onPlay) {
        playButton.addEventListener("click", (event) => {
          event.stopPropagation();
          onPlay(call.call_id || call.callId);
        });
      } else {
        playButton.disabled = true;
      }
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
