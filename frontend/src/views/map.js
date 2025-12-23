import { fetchMapPoints } from "../api";
import { createMapAdapter } from "./map-adapter";
import {
  SUSSEX_CENTER,
  SUSSEX_BOUNDS,
  DEFAULT_ZOOM,
  MAPBOX_ACCESS_TOKEN,
  MAPBOX_STYLE
} from "./config";

function createToggle(label, active) {
  const button = document.createElement("button");
  button.className = `button small ${active ? "active" : ""}`;
  button.textContent = label;
  return button;
}

let cachedView = null;
let resizeListenerAttached = false;

function updateToggleState(markersButton, heatButton, mode) {
  const isHeat = mode === "heatmap";
  markersButton.classList.toggle("active", !isHeat);
  heatButton.classList.toggle("active", isHeat);
}

export async function renderMapView({ filters, onSelect, viewState, onViewState }) {
  if (cachedView) {
    cachedView.filters = filters;
    cachedView.onSelect = onSelect;
    if (cachedView.unsubscribeViewChange) {
      cachedView.unsubscribeViewChange();
    }
    if (onViewState) {
      cachedView.unsubscribeViewChange = cachedView.adapter.onViewChange((nextView) => {
        onViewState({ ...nextView, hasUserView: true });
      });
    }
    updateToggleState(
      cachedView.markersButton,
      cachedView.heatButton,
      filters.mapMode || cachedView.mode || "markers"
    );
    await cachedView.refresh(filters.mapMode || cachedView.mode || "markers");
    cachedView.adapter.map?.resize?.();
    return cachedView.wrapper;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "map-section";

  const heading = document.createElement("div");
  heading.className = "panel-title";
  heading.textContent = "Geographic Context";

  const controls = document.createElement("div");
  controls.className = "map-controls";
  const markersButton = createToggle("Markers", filters.mapMode !== "heatmap");
  const heatButton = createToggle("Heatmap", filters.mapMode === "heatmap");
  controls.appendChild(markersButton);
  controls.appendChild(heatButton);

  const panel = document.createElement("div");
  panel.className = "map-panel";
  const canvas = document.createElement("div");
  canvas.className = "map-canvas";
  const status = document.createElement("div");
  status.className = "map-status";
  panel.appendChild(canvas);
  panel.appendChild(status);

  wrapper.appendChild(heading);
  wrapper.appendChild(controls);
  wrapper.appendChild(panel);

  if (!MAPBOX_ACCESS_TOKEN) {
    status.textContent =
      "Mapbox token missing. Set MAPBOX_ACCESS_TOKEN in the root .env file.";
    return wrapper;
  }

  const initialCenter = viewState?.center || SUSSEX_CENTER;
  const initialZoom =
    typeof viewState?.zoom === "number" ? viewState.zoom : DEFAULT_ZOOM;
  const shouldFitBounds = !viewState?.hasUserView;
  const adapter = createMapAdapter(canvas, {
    center: initialCenter,
    zoom: initialZoom,
    accessToken: MAPBOX_ACCESS_TOKEN,
    style: MAPBOX_STYLE,
    maxBounds: SUSSEX_BOUNDS
  });
  if (shouldFitBounds) {
    adapter.setBounds(SUSSEX_BOUNDS);
  }
  const recordViewState = () => {
    if (!onViewState) return;
    const snapshot = adapter.getViewState();
    if (snapshot?.center) {
      onViewState({ ...snapshot, hasUserView: true });
    }
  };
  let unsubscribeViewChange = null;
  if (onViewState) {
    unsubscribeViewChange = adapter.onViewChange((nextView) => {
      onViewState({ ...nextView, hasUserView: true });
    });
  }
  const scheduleResize = () => {
    const resize = () => {
      if (typeof adapter.map?.resize === "function") {
        adapter.map.resize();
      } else if (typeof adapter.map?.invalidateSize === "function") {
        adapter.map.invalidateSize();
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(resize));
    setTimeout(resize, 100);
  };
  if (!resizeListenerAttached) {
    window.addEventListener("resize", scheduleResize);
    resizeListenerAttached = true;
  }
  if (typeof adapter.map?.once === "function") {
    adapter.map.once("load", () => {
      recordViewState();
      scheduleResize();
    });
  }
  scheduleResize();

  async function refresh(mode) {
    status.textContent = "";
    try {
      const response = await fetchMapPoints({
        filters: cachedView ? cachedView.filters : filters,
        mode,
        entity: "both"
      });
      adapter.setMode(mode);
      if (mode === "heatmap") {
        adapter.setHeatmap(response.points || []);
      } else {
        const selectionHandler = cachedView?.onSelect || onSelect;
        adapter.setMarkers(response.points || [], { onSelect: selectionHandler });
      }
      if (response.truncated) {
        status.textContent = "Map truncated for performance. Narrow filters to see more.";
      } else if (!response.points || response.points.length === 0) {
        status.textContent = "No map points for current filters.";
      }
    } catch (error) {
      status.textContent = `Map unavailable: ${error.message}`;
    }
  }

  markersButton.addEventListener("click", async () => {
    filters.mapMode = "markers";
    if (cachedView) {
      cachedView.mode = "markers";
    }
    updateToggleState(markersButton, heatButton, "markers");
    await refresh("markers");
    scheduleResize();
  });

  heatButton.addEventListener("click", async () => {
    filters.mapMode = "heatmap";
    if (cachedView) {
      cachedView.mode = "heatmap";
    }
    updateToggleState(markersButton, heatButton, "heatmap");
    await refresh("heatmap");
    scheduleResize();
  });

  cachedView = {
    wrapper,
    adapter,
    markersButton,
    heatButton,
    status,
    refresh,
    filters,
    onSelect,
    mode: filters.mapMode || "markers",
    unsubscribeViewChange
  };

  await refresh(filters.mapMode || "markers");
  recordViewState();
  scheduleResize();

  return wrapper;
}
