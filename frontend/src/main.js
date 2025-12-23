import "./styles.css";
import "mapbox-gl/dist/mapbox-gl.css";
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
import {
  DETAIL_CACHE_MS,
  POLL_INTERVAL_MS,
  MAP_VIEW_STORAGE_KEY
} from "./views/config";
import { createAudioPlayer } from "./views/audio-player";

const root = document.getElementById("app");
const filters = createDefaultFilters();
const callCache = new Map();
const incidentCache = new Map();
const audioController = createAudioPlayer();
let listMode = "incidents";
let pollTimer = null;
let sseClient = null;
const sseState = { status: "connecting", lastEventAt: null };
function loadMapViewState() {
  try {
    const raw = window.localStorage.getItem(MAP_VIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.center || typeof parsed.zoom !== "number") return null;
    return { ...parsed, hasUserView: true };
  } catch (_error) {
    return null;
  }
}

function storeMapViewState(state) {
  if (!state?.center || typeof state.zoom !== "number") return;
  try {
    window.localStorage.setItem(
      MAP_VIEW_STORAGE_KEY,
      JSON.stringify({ center: state.center, zoom: state.zoom })
    );
  } catch (_error) {
    // ignore storage errors
  }
}

let mapViewState = loadMapViewState();

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

function startPollingFallback() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    if (!document.hidden) {
      render({ preserveScroll: true }).catch(() => null);
    }
  }, POLL_INTERVAL_MS);
}

function stopPollingFallback() {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
}

function updateSseStatus(status) {
  sseState.status = status;
  render({ preserveScroll: true }).catch(() => null);
}

function connectSse() {
  stopPollingFallback();
  if (!("EventSource" in window)) {
    updateSseStatus("disconnected");
    startPollingFallback();
    return;
  }
  if (sseClient) {
    sseClient.close();
  }
  sseClient = new EventSource("/api/events");
  updateSseStatus("connecting");

  sseClient.addEventListener("refresh", () => {
    sseState.lastEventAt = new Date().toISOString();
    if (!document.hidden) {
      render({ preserveScroll: true }).catch(() => null);
    }
  });

  sseClient.addEventListener("open", () => {
    updateSseStatus("connected");
  });

  sseClient.addEventListener("error", () => {
    updateSseStatus("disconnected");
  });
}

async function render({ preserveScroll = false } = {}) {
  const leftScroll = preserveScroll
    ? document.querySelector(".panel-left")?.scrollTop ?? 0
    : 0;
  const centerScroll = preserveScroll
    ? document.querySelector(".panel-center")?.scrollTop ?? 0
    : 0;

  const hash = window.location.hash.replace("#", "");
  if (hash.startsWith("call/")) {
    const callId = hash.split("/")[1];
    const left = renderFilterPanel({ filters, onChange: applyFilters });
    const right = await renderMapView({
      filters,
      viewState: mapViewState,
      onViewState: (next) => {
        mapViewState = next;
        storeMapViewState(next);
      },
      onSelect: (point) => {
        if (point.entity_type === "call") {
          window.location.hash = `call/${point.entity_id}`;
        } else {
          window.location.hash = `incident/${point.entity_id}`;
        }
      }
    });
    const center = await renderCallDetailView({
      callId,
      prefetched: await getCachedCall(callId),
      audioController,
      onFeedback: (id) => {
        callCache.delete(id);
      },
      onBack: () => {
        window.location.hash = "";
      }
    });
    const summary = await renderSummaryView({ filters });
    renderLayout(root, {
      title: "Call Detail",
      left,
      center,
      right,
      summary,
      footer: audioController.element,
      sseStatus: sseState
    });
    return;
  }

  if (hash.startsWith("incident/")) {
    const incidentId = hash.split("/")[1];
    const left = renderFilterPanel({ filters, onChange: applyFilters });
    const right = await renderMapView({
      filters,
      viewState: mapViewState,
      onViewState: (next) => {
        mapViewState = next;
        storeMapViewState(next);
      },
      onSelect: (point) => {
        if (point.entity_type === "call") {
          window.location.hash = `call/${point.entity_id}`;
        } else {
          window.location.hash = `incident/${point.entity_id}`;
        }
      }
    });
    const center = await renderIncidentDetailView({
      incidentId,
      prefetched: await getCachedIncident(incidentId),
      onFeedback: (id) => {
        incidentCache.delete(id);
      },
      onBack: () => {
        window.location.hash = "incidents";
      }
    });
    const summary = await renderSummaryView({ filters });
    renderLayout(root, {
      title: "Incident Detail",
      left,
      center,
      right,
      summary,
      footer: audioController.element,
      sseStatus: sseState
    });
    return;
  }

  if (hash === "calls") {
    listMode = "calls";
  } else if (hash === "incidents") {
    listMode = "incidents";
  }

  if (hash === "notifications") {
    const body = await renderNotificationsView();
    renderLayout(root, { title: "Notifications", center: body, sseStatus: sseState });
    return;
  }

  const summary = await renderSummaryView({ filters });
  const left = renderFilterPanel({ filters, onChange: applyFilters });
  const viewToggle = document.createElement("div");
  viewToggle.className = "view-toggle";
  const incidentsButton = document.createElement("button");
  incidentsButton.className = `button small ${listMode === "incidents" ? "active" : ""}`;
  incidentsButton.textContent = "Incidents";
  incidentsButton.addEventListener("click", () => {
    listMode = "incidents";
    window.location.hash = "incidents";
  });
  const callsButton = document.createElement("button");
  callsButton.className = `button small ${listMode === "calls" ? "active" : ""}`;
  callsButton.textContent = "Calls";
  callsButton.addEventListener("click", () => {
    listMode = "calls";
    window.location.hash = "calls";
  });
  viewToggle.appendChild(incidentsButton);
  viewToggle.appendChild(callsButton);

  let centerBody;
  if (listMode === "calls") {
    centerBody = await renderCallsView({
      filters,
      onSelect: (callId) => {
        window.location.hash = `call/${callId}`;
      },
      onPlay: async (callId) => {
        const detail = await getCachedCall(callId);
        audioController.setSource({
          src: detail.audio?.url,
          label: `${detail.operator_fields?.agency || "Unknown"} · ${detail.operator_fields?.incident_type || "Unspecified"}`
        });
      }
    });
  } else {
    centerBody = await renderIncidentsView({
      filters,
      onSelect: (incidentId) => {
        window.location.hash = `incident/${incidentId}`;
      }
    });
  }

  const center = document.createElement("div");
  center.className = "center-stack";
  center.appendChild(viewToggle);
  center.appendChild(centerBody);

  const right = await renderMapView({
    filters,
    viewState: mapViewState,
    onViewState: (next) => {
      mapViewState = next;
      storeMapViewState(next);
    },
    onSelect: (point) => {
      if (point.entity_type === "call") {
        window.location.hash = `call/${point.entity_id}`;
      } else {
        window.location.hash = `incident/${point.entity_id}`;
      }
    }
  });

  renderLayout(root, {
    title: "Operations",
    left,
    center,
    right,
    summary,
    footer: audioController.element,
    sseStatus: sseState,
    nav: null
  });
  if (preserveScroll) {
    requestAnimationFrame(() => {
      const leftEl = document.querySelector(".panel-left");
      const centerEl = document.querySelector(".panel-center");
      if (leftEl) leftEl.scrollTop = leftScroll;
      if (centerEl) centerEl.scrollTop = centerScroll;
    });
  }
}

window.addEventListener("hashchange", render);
render().catch((error) => {
  const placeholder = document.createElement("div");
  placeholder.className = "empty-state";
  placeholder.textContent = `Failed to load: ${error.message}`;
  renderLayout(root, { title: "Call Feed", body: placeholder, sseStatus: sseState });
});
connectSse();
