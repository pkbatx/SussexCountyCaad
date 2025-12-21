import "./styles.css";
import { renderLayout } from "./views/layout";
import { renderCallsView } from "./views/calls";
import { renderCallDetailView } from "./views/call-detail";
import { renderIncidentsView } from "./views/incidents";
import { renderIncidentDetailView } from "./views/incident-detail";
import { renderNotificationsView } from "./views/notifications";
import { createDefaultFilters, renderFilterPanel } from "./views/filters";
import { renderMapView } from "./views/map";
import { renderSummaryView } from "./views/summary";
import { getCallDetail, getIncidentDetail } from "./api";
import { DETAIL_CACHE_MS, POLL_INTERVAL_MS } from "./views/config";

const root = document.getElementById("app");
const filters = createDefaultFilters();
const callCache = new Map();
const incidentCache = new Map();
let pollTimer = null;

function applyFilters(next) {
  Object.assign(filters, next);
  callCache.clear();
  incidentCache.clear();
  render().catch(() => null);
}

async function getCachedCall(callId) {
  const cached = callCache.get(callId);
  if (cached && Date.now() - cached.fetchedAt < DETAIL_CACHE_MS) {
    return cached.data;
  }
  const data = await getCallDetail(callId);
  callCache.set(callId, { data, fetchedAt: Date.now() });
  return data;
}

async function getCachedIncident(incidentId) {
  const cached = incidentCache.get(incidentId);
  if (cached && Date.now() - cached.fetchedAt < DETAIL_CACHE_MS) {
    return cached.data;
  }
  const data = await getIncidentDetail(incidentId);
  incidentCache.set(incidentId, { data, fetchedAt: Date.now() });
  return data;
}

function resetPolling(enabled) {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (!enabled) return;
  pollTimer = setInterval(() => {
    if (!document.hidden) {
      render({ preserveScroll: true }).catch(() => null);
    }
  }, POLL_INTERVAL_MS);
}

async function render({ preserveScroll = false } = {}) {
  const sidebarScroll = preserveScroll
    ? document.querySelector(".panel-sidebar")?.scrollTop ?? 0
    : 0;
  const mainScroll = preserveScroll
    ? document.querySelector(".panel-main")?.scrollTop ?? 0
    : 0;

  const hash = window.location.hash.replace("#", "");
  if (hash.startsWith("call/")) {
    const callId = hash.split("/")[1];
    const body = await renderCallDetailView({
      callId,
      prefetched: await getCachedCall(callId),
      onBack: () => {
        window.location.hash = "";
      }
    });
    renderLayout(root, { title: "Call Detail", body });
    resetPolling(false);
    return;
  }

  if (hash.startsWith("incident/")) {
    const incidentId = hash.split("/")[1];
    const body = await renderIncidentDetailView({
      incidentId,
      prefetched: await getCachedIncident(incidentId),
      onBack: () => {
        window.location.hash = "incidents";
      }
    });
    renderLayout(root, { title: "Incident Detail", body });
    resetPolling(false);
    return;
  }

  if (hash === "incidents") {
    const summary = await renderSummaryView({ filters });
    const filterPanel = renderFilterPanel({ filters, onChange: applyFilters });
    const incidentList = await renderIncidentsView({
      filters,
      onSelect: (incidentId) => {
        window.location.hash = `incident/${incidentId}`;
      }
    });
    const sidebar = document.createElement("div");
    sidebar.className = "sidebar-stack";
    sidebar.appendChild(filterPanel);
    sidebar.appendChild(incidentList);
    const main = await renderMapView({
      filters,
      onSelect: (point) => {
        if (point.entity_type === "call") {
          window.location.hash = `call/${point.entity_id}`;
        } else {
          window.location.hash = `incident/${point.entity_id}`;
        }
      }
    });
    renderLayout(root, { title: "Incidents", sidebar, main, summary });
    if (preserveScroll) {
      requestAnimationFrame(() => {
        const sidebarEl = document.querySelector(".panel-sidebar");
        const mainEl = document.querySelector(".panel-main");
        if (sidebarEl) sidebarEl.scrollTop = sidebarScroll;
        if (mainEl) mainEl.scrollTop = mainScroll;
      });
    }
    resetPolling(true);
    return;
  }

  if (hash === "calls") {
    const summary = await renderSummaryView({ filters });
    const filterPanel = renderFilterPanel({ filters, onChange: applyFilters });
    const callList = await renderCallsView({
      filters,
      onSelect: (callId) => {
        window.location.hash = `call/${callId}`;
      }
    });
    const sidebar = document.createElement("div");
    sidebar.className = "sidebar-stack";
    sidebar.appendChild(filterPanel);
    sidebar.appendChild(callList);
    const main = await renderMapView({
      filters,
      onSelect: (point) => {
        if (point.entity_type === "call") {
          window.location.hash = `call/${point.entity_id}`;
        } else {
          window.location.hash = `incident/${point.entity_id}`;
        }
      }
    });
    renderLayout(root, { title: "Calls", sidebar, main, summary });
    if (preserveScroll) {
      requestAnimationFrame(() => {
        const sidebarEl = document.querySelector(".panel-sidebar");
        const mainEl = document.querySelector(".panel-main");
        if (sidebarEl) sidebarEl.scrollTop = sidebarScroll;
        if (mainEl) mainEl.scrollTop = mainScroll;
      });
    }
    resetPolling(true);
    return;
  }

  if (hash === "notifications") {
    const body = await renderNotificationsView();
    renderLayout(root, { title: "Notifications", body });
    resetPolling(false);
    return;
  }

  const summary = await renderSummaryView({ filters });
  const filterPanel = renderFilterPanel({ filters, onChange: applyFilters });
  const incidentList = await renderIncidentsView({
    filters,
    onSelect: (incidentId) => {
      window.location.hash = `incident/${incidentId}`;
    }
  });
  const sidebar = document.createElement("div");
  sidebar.className = "sidebar-stack";
  sidebar.appendChild(filterPanel);
  sidebar.appendChild(incidentList);
  const main = await renderMapView({
    filters,
    onSelect: (point) => {
      if (point.entity_type === "call") {
        window.location.hash = `call/${point.entity_id}`;
      } else {
        window.location.hash = `incident/${point.entity_id}`;
      }
    }
  });
  renderLayout(root, { title: "Incidents", sidebar, main, summary });
  if (preserveScroll) {
    requestAnimationFrame(() => {
      const sidebarEl = document.querySelector(".panel-sidebar");
      const mainEl = document.querySelector(".panel-main");
      if (sidebarEl) sidebarEl.scrollTop = sidebarScroll;
      if (mainEl) mainEl.scrollTop = mainScroll;
    });
  }
  resetPolling(true);
}

window.addEventListener("hashchange", render);
render().catch((error) => {
  const placeholder = document.createElement("div");
  placeholder.className = "empty-state";
  placeholder.textContent = `Failed to load: ${error.message}`;
  renderLayout(root, { title: "Call Feed", body: placeholder });
});
