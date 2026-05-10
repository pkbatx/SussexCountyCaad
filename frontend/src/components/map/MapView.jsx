import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchMapPoints } from "../../api";
import { useMapbox } from "../../hooks/useMapbox";
import {
  MAPBOX_ACCESS_TOKEN,
  SUSSEX_BOUNDS
} from "../../config";
import { MapModeToggle } from "./MapModeToggle";

// MapView has two modes:
//   mode="global"    — full set of map points fetched via /api/map/points,
//                      driven by `filters` and the markers/heatmap toggle.
//                      Marker mode uses Mapbox source clustering at zoom <=10.
//   mode="incident"  — embedded inside IncidentDetail. Filters
//                      /api/map/points client-side to the incident's
//                      member call_ids, flies to the centroid on mount,
//                      and renders a pulse marker for active incidents.

export function MapView({
  mode = "global",
  filters,
  onSelect,
  viewState,
  onViewState,
  onModeChange,
  refreshToken,
  // incident-mode props
  incident,
  memberCallIds,
  isActive
}) {
  const containerRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const onViewStateRef = useRef(onViewState);
  const [status, setStatus] = useState("");
  const [renderMode, setRenderMode] = useState(filters?.mapMode || "markers");
  const effectiveMode = filters?.mapMode || renderMode;

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onViewStateRef.current = onViewState; }, [onViewState]);

  const handleViewChange = useCallback((next) => {
    onViewStateRef.current?.({ ...next, hasUserView: true });
  }, []);

  const adapter = useMapbox({
    containerRef,
    viewState: mode === "incident" ? null : viewState,
    onViewChange: mode === "global" ? handleViewChange : undefined,
    fitBoundsOnInit: mode === "global"
  });

  // Refresh the source data based on mode.
  useEffect(() => {
    if (!adapter) return;

    let cancelled = false;
    setStatus("");

    async function load() {
      try {
        const response = await fetchMapPoints({
          filters: filters || {},
          mode: mode === "incident" ? "markers" : effectiveMode,
          entity: mode === "incident" ? "call" : "both"
        });
        if (cancelled) return;
        let points = response.points || [];

        if (mode === "incident" && Array.isArray(memberCallIds) && memberCallIds.length > 0) {
          const memberSet = new Set(memberCallIds);
          points = points.filter((p) => memberSet.has(p.entity_id));
        }

        adapter.setMode(mode === "incident" ? "markers" : effectiveMode);
        if (mode !== "incident" && effectiveMode === "heatmap") {
          adapter.setHeatmap(points);
        } else {
          adapter.setMarkers(points, { onSelect: onSelectRef.current });
        }

        if (mode === "incident" && points.length > 0) {
          const lat = points.reduce((s, p) => s + p.latitude, 0) / points.length;
          const lng = points.reduce((s, p) => s + p.longitude, 0) / points.length;
          adapter.flyTo(lat, lng, 14);
          if (isActive) {
            adapter.setPulseMarker(lat, lng);
          } else {
            adapter.clearPulseMarker();
          }
        } else if (mode === "incident") {
          adapter.clearPulseMarker();
          setStatus("No geocoded calls for this incident.");
        } else if (response.truncated) {
          setStatus("Map truncated for performance. Narrow filters to see more.");
        } else if (points.length === 0) {
          setStatus("No map points for current filters.");
        }
      } catch (error) {
        if (!cancelled) setStatus(`Map unavailable: ${error.message}`);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [adapter, mode, effectiveMode, filters, refreshToken, memberCallIds, isActive]);

  useEffect(() => {
    if (filters?.mapMode && filters.mapMode !== renderMode) {
      setRenderMode(filters.mapMode);
    }
  }, [filters?.mapMode, renderMode]);

  const handleReset = useCallback(() => {
    adapter?.setBounds(SUSSEX_BOUNDS);
  }, [adapter]);

  const panelTitle = useMemo(
    () => (mode === "incident" ? "Incident Geography" : "Geographic Context"),
    [mode]
  );

  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <div className="map-section">
        <div className="section-title">{panelTitle}</div>
        <div className="map-panel">
          <div className="map-status">
            Mapbox token missing. Set MAPBOX_ACCESS_TOKEN in the root .env file.
          </div>
        </div>
      </div>
    );
  }

  if (mode === "incident") {
    return (
      <>
        <div ref={containerRef} className="map-canvas" style={{ position: "absolute", inset: 0 }} />
        {status ? <div className="map-status map-status--floating">{status}</div> : null}
      </>
    );
  }

  return (
    <div className="map-section">
      <div className="section-title">{panelTitle}</div>
      <div className="map-controls-row">
        <MapModeToggle
          value={effectiveMode}
          onChange={(next) => {
            setRenderMode(next);
            onModeChange?.(next);
          }}
        />
        <button className="map-reset-btn" type="button" onClick={handleReset}>
          Reset view
        </button>
      </div>
      <div className="map-panel">
        <div ref={containerRef} className="map-canvas" />
        {status ? <div className="map-status">{status}</div> : null}
      </div>
    </div>
  );
}
