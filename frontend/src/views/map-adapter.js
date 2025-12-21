import L from "leaflet";
import "leaflet.heat";
import "leaflet.markercluster";

export function createMapAdapter(container, { center, zoom, tileUrl }) {
  const rootStyles = getComputedStyle(document.documentElement);
  const readVar = (name, fallback) => {
    const value = rootStyles.getPropertyValue(name).trim();
    return value || fallback;
  };
  const markerStroke = readVar("--map-marker", "#a1a1aa");
  const markerFill = readVar("--map-marker-fill", "#f59e0b");
  const heatLow = readVar("--heat-low", "#334155");
  const heatMid = readVar("--heat-mid", "#f59e0b");
  const heatHigh = readVar("--heat-high", "#ef4444");

  const map = L.map(container, { zoomControl: true });
  L.tileLayer(tileUrl, {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  const markerLayer = L.markerClusterGroup();
  const heatLayer = L.heatLayer([], {
    radius: 24,
    blur: 18,
    maxZoom: 15,
    gradient: { 0.2: heatLow, 0.6: heatMid, 1.0: heatHigh }
  });
  let mode = "markers";

  map.setView(center, zoom);
  map.addLayer(markerLayer);

  function setMode(nextMode) {
    if (mode === nextMode) return;
    if (nextMode === "heatmap") {
      map.removeLayer(markerLayer);
      map.addLayer(heatLayer);
    } else {
      map.removeLayer(heatLayer);
      map.addLayer(markerLayer);
    }
    mode = nextMode;
  }

  function setMarkers(points, { onSelect } = {}) {
    markerLayer.clearLayers();
    points.forEach((point) => {
      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: 6,
        color: markerStroke,
        weight: 1,
        fillColor: markerFill,
        fillOpacity: 0.8
      });
      if (onSelect && point.entity_id) {
        marker.on("click", () => onSelect(point));
      }
      markerLayer.addLayer(marker);
    });
  }

  function setHeatmap(points) {
    const heatPoints = points.map((point) => [
      point.latitude,
      point.longitude,
      point.intensity ?? point.weight ?? 0.5
    ]);
    heatLayer.setLatLngs(heatPoints);
  }

  function setBounds(bounds) {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [20, 20] });
  }

  function destroy() {
    map.remove();
  }

  return {
    map,
    setMode,
    setMarkers,
    setHeatmap,
    setBounds,
    destroy
  };
}
