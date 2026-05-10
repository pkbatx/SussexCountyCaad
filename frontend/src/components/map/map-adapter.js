import mapboxgl from "mapbox-gl";

const SOURCE_ID = "points";
const HEAT_LAYER_ID = "heatmap";
const MARKER_LAYER_ID = "markers";
const CLUSTER_LAYER_ID = "clusters";
const CLUSTER_COUNT_LAYER_ID = "cluster-count";

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
  let pulseMarker = null;

  function ensureSource() {
    if (map.getSource(SOURCE_ID)) return;
    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: toGeoJSON([]),
      cluster: true,
      clusterMaxZoom: 10,
      clusterRadius: 40
    });
  }

  function ensureLayers() {
    if (map.getLayer(HEAT_LAYER_ID)) return;
    // Heatmap reads from the same clustered source. Heatmap weights the
    // cluster point_count when present; otherwise falls back to weight.
    map.addLayer({
      id: HEAT_LAYER_ID,
      type: "heatmap",
      source: SOURCE_ID,
      maxzoom: 15,
      paint: {
        "heatmap-weight": [
          "case",
          ["has", "point_count"],
          ["/", ["get", "point_count"], 6],
          ["coalesce", ["get", "weight"], 0.5]
        ],
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

    // Cluster bubble (marker mode only).
    map.addLayer({
      id: CLUSTER_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#3b82f6",
        "circle-stroke-color": "#3a4255",
        "circle-stroke-width": 1,
        "circle-opacity": 0.85,
        "circle-radius": [
          "step",
          ["get", "point_count"],
          14,
          5, 18,
          15, 22,
          50, 26
        ]
      }
    });

    // Cluster count label.
    map.addLayer({
      id: CLUSTER_COUNT_LAYER_ID,
      type: "symbol",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        "text-size": 11
      },
      paint: {
        "text-color": "#0a0c0f"
      }
    });

    // Unclustered points.
    map.addLayer({
      id: MARKER_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": 5,
        "circle-color": "#06b6d4",
        "circle-stroke-width": 1,
        "circle-stroke-color": "#94a3b8",
        "circle-opacity": 0.9
      }
    });
  }

  function updateSource(points) {
    const source = map.getSource(SOURCE_ID);
    if (!source) return;
    source.setData(toGeoJSON(points));
  }

  function applyModeVisibility(nextMode) {
    const heatVisible = nextMode === "heatmap" ? "visible" : "none";
    const markerVisible = nextMode === "markers" ? "visible" : "none";
    map.setLayoutProperty(HEAT_LAYER_ID, "visibility", heatVisible);
    map.setLayoutProperty(CLUSTER_LAYER_ID, "visibility", markerVisible);
    map.setLayoutProperty(CLUSTER_COUNT_LAYER_ID, "visibility", markerVisible);
    map.setLayoutProperty(MARKER_LAYER_ID, "visibility", markerVisible);
  }

  function setMode(nextMode) {
    if (!mapReady) {
      pendingMode = nextMode;
      return;
    }
    if (mode === nextMode) return;
    applyModeVisibility(nextMode);
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

  function flyTo(lat, lng, targetZoom = 13) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (!mapReady) {
      pendingBounds = null;
      map.once("load", () => flyTo(lat, lng, targetZoom));
      return;
    }
    map.flyTo({ center: [lng, lat], zoom: targetZoom, speed: 1.2 });
  }

  function setPulseMarker(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      clearPulseMarker();
      return;
    }
    if (pulseMarker) {
      pulseMarker.setLngLat([lng, lat]);
      return;
    }
    const el = document.createElement("div");
    el.className = "pulse-marker";
    pulseMarker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map);
  }

  function clearPulseMarker() {
    if (pulseMarker) {
      pulseMarker.remove();
      pulseMarker = null;
    }
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
    clearPulseMarker();
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
    applyModeVisibility(pendingMode);
    mode = pendingMode;
    map.resize();
    if (pendingBounds) {
      setBounds(pendingBounds);
      pendingBounds = null;
    }

    // Click-to-zoom on clusters.
    map.on("click", CLUSTER_LAYER_ID, (event) => {
      const features = map.queryRenderedFeatures(event.point, { layers: [CLUSTER_LAYER_ID] });
      const clusterId = features[0]?.properties?.cluster_id;
      const source = map.getSource(SOURCE_ID);
      if (clusterId == null || !source) return;
      source.getClusterExpansionZoom(clusterId, (err, expansionZoom) => {
        if (err) return;
        map.easeTo({ center: features[0].geometry.coordinates, zoom: expansionZoom });
      });
    });

    map.on("click", MARKER_LAYER_ID, (event) => {
      if (!currentOnSelect) return;
      const feature = event.features?.[0];
      if (!feature?.properties?.entity_id) return;
      currentOnSelect({
        entity_id: feature.properties.entity_id,
        entity_type: feature.properties.entity_type
      });
    });
  });

  return {
    map,
    setMode,
    setMarkers,
    setHeatmap,
    setBounds,
    flyTo,
    setPulseMarker,
    clearPulseMarker,
    getViewState,
    setViewState,
    onViewChange,
    destroy
  };
}
