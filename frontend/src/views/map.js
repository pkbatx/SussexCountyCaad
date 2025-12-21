import { fetchMapPoints } from "../api";
import { createMapAdapter } from "./map-adapter";
import { SUSSEX_CENTER, SUSSEX_BOUNDS, DEFAULT_ZOOM, TILE_URL } from "./config";

function createToggle(label, active) {
  const button = document.createElement("button");
  button.className = `button small ${active ? "active" : ""}`;
  button.textContent = label;
  return button;
}

export async function renderMapView({ filters, onSelect }) {
  const wrapper = document.createElement("div");
  wrapper.className = "detail-section";

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

  wrapper.appendChild(controls);
  wrapper.appendChild(panel);

  const adapter = createMapAdapter(canvas, {
    center: SUSSEX_CENTER,
    zoom: DEFAULT_ZOOM,
    tileUrl: TILE_URL
  });
  adapter.setBounds(SUSSEX_BOUNDS);
  const scheduleResize = () => {
    setTimeout(() => {
      adapter.map.invalidateSize();
    }, 0);
  };
  window.addEventListener("resize", scheduleResize);
  scheduleResize();

  async function refresh(mode) {
    status.textContent = "";
    try {
      const response = await fetchMapPoints({
        filters,
        mode,
        entity: "both"
      });
      adapter.setMode(mode);
      if (mode === "heatmap") {
        adapter.setHeatmap(response.points || []);
      } else {
        adapter.setMarkers(response.points || [], { onSelect });
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
    markersButton.classList.add("active");
    heatButton.classList.remove("active");
    await refresh("markers");
    scheduleResize();
  });

  heatButton.addEventListener("click", async () => {
    filters.mapMode = "heatmap";
    heatButton.classList.add("active");
    markersButton.classList.remove("active");
    await refresh("heatmap");
    scheduleResize();
  });

  await refresh(filters.mapMode || "markers");
  scheduleResize();

  return wrapper;
}
