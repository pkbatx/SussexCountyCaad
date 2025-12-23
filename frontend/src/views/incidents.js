import { listIncidents } from "../api";
import {
  TAG_NEW_WINDOW_MINUTES,
  TAG_UPDATED_WINDOW_MINUTES,
  AUTO_RESOLVE_MINUTES,
  MONITOR_WINDOW_MINUTES
} from "./config";

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

function minutesSince(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return (Date.now() - date.getTime()) / (1000 * 60);
}

function deriveBucket(incident) {
  const updatedAt = incident.last_rollup_at || incident.updated_at;
  const ageMinutes = minutesSince(updatedAt);
  if (ageMinutes === null) {
    return { bucket: "active", label: "Active", ageMinutes: null };
  }
  if (ageMinutes >= AUTO_RESOLVE_MINUTES) {
    return { bucket: "resolved", label: "Resolved", ageMinutes };
  }
  if (ageMinutes >= MONITOR_WINDOW_MINUTES) {
    return { bucket: "monitoring", label: "Monitoring", ageMinutes };
  }
  return { bucket: "active", label: "Active", ageMinutes };
}

function buildTags(incident) {
  const tags = [];
  const memberCount = incident.member_count ?? 0;
  const reAlertCount = incident.re_alert_count ?? 0;
  const updatedAt = incident.last_rollup_at || incident.updated_at;
  const ageMinutes = minutesSince(updatedAt);

  if (ageMinutes !== null) {
    if (ageMinutes <= TAG_NEW_WINDOW_MINUTES && memberCount <= 1) {
      tags.push("New");
    } else if (ageMinutes <= TAG_UPDATED_WINDOW_MINUTES) {
      tags.push("Updated");
    }
  }

  if (memberCount >= 2) tags.push("Multi-Call");
  if (reAlertCount > 0) tags.push("Re-alert");
  if (!incident.address && !incident.town) tags.push("Unmapped");
  if (!incident.incident_type || incident.status === "failed") {
    tags.push("Needs Attention");
  }

  return tags;
}

export async function renderIncidentsView({ onSelect, filters }) {
  const container = document.createElement("div");
  container.className = "incidents-view";

  const board = document.createElement("div");
  board.className = "incident-board";
  container.appendChild(board);

  const bucketDefs = [
    {
      key: "active",
      title: "Active",
      hint: `0-${MONITOR_WINDOW_MINUTES}m`
    },
    {
      key: "monitoring",
      title: "Monitoring",
      hint: `${MONITOR_WINDOW_MINUTES}-${AUTO_RESOLVE_MINUTES}m`
    },
    {
      key: "resolved",
      title: "Resolved",
      hint: `>${AUTO_RESOLVE_MINUTES}m`
    }
  ];

  const columnLists = {};
  bucketDefs.forEach((bucket) => {
    const column = document.createElement("section");
    column.className = `incident-column incident-column--${bucket.key}`;
    const header = document.createElement("div");
    header.className = "incident-column-header";
    header.innerHTML = `<span>${bucket.title}</span><span class="column-hint">${bucket.hint}</span>`;
    const list = document.createElement("ul");
    list.className = "incident-list";
    column.appendChild(header);
    column.appendChild(list);
    board.appendChild(column);
    columnLists[bucket.key] = list;
  });

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
      const address = incident.address || incident.town || "No address";
      const updatedAt = incident.last_rollup_at || incident.updated_at || "n/a";
      const memberCount = incident.member_count ?? 0;
      const reAlertCount = incident.re_alert_count ?? 0;
      const summary = incident.latest_summary || "No rollup summary yet.";
      const timestamp = formatTimestamp(updatedAt);
      const agencies = Array.isArray(incident.agencies)
        ? incident.agencies
        : incident.agency
        ? [incident.agency]
        : [];
      const metaLine = [incident.incident_type].filter(Boolean).join(" · ");
      const tags = buildTags(incident);
      const bucket = deriveBucket(incident);
      const list = columnLists[bucket.bucket] || columnLists.active;
      const resolveIn =
        bucket.bucket === "resolved" || bucket.ageMinutes === null
          ? null
          : Math.max(AUTO_RESOLVE_MINUTES - Math.floor(bucket.ageMinutes), 0);
      const item = document.createElement("li");
      item.className = "cad-card";
      item.innerHTML = `
        <div class="cad-card-main">
          <div class="cad-card-title">${address}</div>
          <div class="cad-card-summary">${summary}</div>
          <div class="cad-card-meta">${metaLine || "Unspecified"}</div>
          <div class="cad-card-agencies">
            ${agencies
              .map((agency) => `<span class=\"agency-chip\">${agency}</span>`)
              .join("")}
          </div>
          <div class="cad-card-tags">${tags
            .map((tag) => `<span class=\"tag\">${tag}</span>`)
            .join("")}</div>
        </div>
        <div class="cad-card-status">
          <span class="status-badge status-${bucket.bucket}">${bucket.label}</span>
          <div class="incident-updated" title="${timestamp.title}">${timestamp.text}</div>
          <div class="incident-meta">calls ${memberCount}</div>
          <div class="incident-meta">re-alerts ${reAlertCount}</div>
          ${
            resolveIn !== null
              ? `<div class="incident-meta">auto resolve in ${resolveIn}m</div>`
              : ""
          }
        </div>
      `;
      item.addEventListener("click", () =>
        onSelect(incident.incident_id || incident.incidentId)
      );
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
