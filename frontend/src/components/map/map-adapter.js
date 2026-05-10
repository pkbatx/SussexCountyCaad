import mapboxgl from "mapbox-gl";

const SOURCE_ID = "points";
const HEAT_LAYER_ID = "heatmap";
const MARKER_LAYER_ID = "markers";

function toGeoJSON(points) {
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [point.longitude, point.latitude]
      },
      properties: {
        entity_id: point.entity_id || null,
        entity_type: point.entity_type || null,
        weight: point.intensity ?? point.weight ?? 0.5
      }
    }))
  };
}

export function createMapAdapter(container, { center, zoom, accessToken, style, maxBounds }) {
  if (accessToken) {
    mapboxgl.accessToken = accessToken;
  }

  const map = new mapboxgl.Map({
    container,
    style,
    center: [center[1], center[0]],
    zoom,
    interactive: true
  });
  if (Array.isArray(maxBounds) && maxBounds.length === 2) {
    map.setMaxBounds([
      [maxBounds[0][1], maxBounds[0][0]],
      [maxBounds[1][1], maxBounds[1][0]]
    ]);
  }
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

  let mode = "markers";
  let pendingPoints = [];
  let pendingMode = mode;
  let pendingBounds = null;
  let currentOnSelect = null;
  let mapReady = false;

  function ensureSource() {
    if (map.getSource(SOURCE_ID)) return;
    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: toGeoJSON([])
    });
  }

  function ensureLayers() {
    if (map.getLayer(HEAT_LAYER_ID) || map.getLayer(MARKER_LAYER_ID)) return;
    map.addLayer({
      id: HEAT_LAYER_ID,
      type: "heatmap",
      source: SOURCE_ID,
      maxzoom: 15,
      paint: {
        "heatmap-weight": ["coalesce", ["get", "weight"], 0.5],
        "heatmap-intensity": 1,
        "heatmap-radius": 22,
        "heatmap-opacity": 0.85,
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(15, 23, 42, 0)",
          0.3,
          "#334155",
          0.65,
          "#f59e0b",
          1,
          "#ef4444"
        ]
      }
    });

    map.addLayer({
      id: MARKER_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      paint: {
        "circle-radius": 5,
        "circle-color": "#f59e0b",
        "circle-stroke-width": 1,
        "circle-stroke-color": "#94a3b8",
        "circle-opacity": 0.85
      }
    });
  }

  function updateSource(points) {
    const source = map.getSource(SOURCE_ID);
    if (!source) return;
    source.setData(toGeoJSON(points));
  }

  function setMode(nextMode) {
    if (!mapReady) {
      pendingMode = nextMode;
      return;
    }
    if (mode === nextMode) return;
    const heatVisible = nextMode === "heatmap" ? "visible" : "none";
    const markerVisible = nextMode === "markers" ? "visible" : "none";
    map.setLayoutProperty(HEAT_LAYER_ID, "visibility", heatVisible);
    map.setLayoutProperty(MARKER_LAYER_ID, "visibility", markerVisible);
    mode = nextMode;
  }

  function setMarkers(points, { onSelect } = {}) {
    currentOnSelect = onSelect || null;
    pendingPoints = points;
    if (mapReady) {
      updateSource(points);
    }
  }

  function setHeatmap(points) {
    pendingPoints = points;
    if (mapReady) {
      updateSource(points);
    }
  }

  function setBounds(bounds) {
    if (!bounds) return;
    if (!mapReady) {
      pendingBounds = bounds;
      return;
    }
    map.fitBounds(
      [
        [bounds[0][1], bounds[0][0]],
        [bounds[1][1], bounds[1][0]]
      ],
      { padding: 20, animate: false }
    );
  }

  function getViewState() {
    const mapCenter = map.getCenter();
    return {
      center: [mapCenter.lat, mapCenter.lng],
      zoom: map.getZoom()
    };
  }

  function setViewState({ center: nextCenter, zoom: nextZoom } = {}) {
    if (!nextCenter || typeof nextZoom !== "number") return;
    if (!mapReady) {
      pendingBounds = null;
    }
    map.jumpTo({ center: [nextCenter[1], nextCenter[0]], zoom: nextZoom });
  }

  function onViewChange(handler) {
    if (typeof handler !== "function") return () => {};
    const listener = () => handler(getViewState());
    map.on("moveend", listener);
    return () => map.off("moveend", listener);
  }

  function destroy() {
    map.remove();
  }

  map.on("load", () => {
    mapReady = true;
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.boxZoom.enable();
    map.doubleClickZoom.enable();
    map.dragRotate.enable();
    map.keyboard.enable();
    map.touchZoomRotate.enable();
    ensureSource();
    ensureLayers();
    updateSource(pendingPoints);
    setMode(pendingMode);
    map.resize();
    if (pendingBounds) {
      setBounds(pendingBounds);
      pendingBounds = null;
    }
    if (currentOnSelect) {
      map.on("click", MARKER_LAYER_ID, (event) => {
        const feature = event.features?.[0];
        if (!feature?.properties?.entity_id) return;
        currentOnSelect({
          entity_id: feature.properties.entity_id,
          entity_type: feature.properties.entity_type
        });
      });
    }
  });

  return {
    map,
    setMode,
    setMarkers,
    setHeatmap,
    setBounds,
    getViewState,
    setViewState,
    onViewChange,
    destroy
  };
}
