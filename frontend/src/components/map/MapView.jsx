import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchMapPoints } from "../../api";
import { createMapAdapter } from "./map-adapter";
import {
  DEFAULT_ZOOM,
  MAPBOX_ACCESS_TOKEN,
  MAPBOX_STYLE,
  SUSSEX_BOUNDS,
  SUSSEX_CENTER
} from "../../config";
import { MapModeToggle } from "./MapModeToggle";

export function MapView({
  filters,
  onSelect,
  viewState,
  onViewState,
  onModeChange,
  refreshToken
}) {
  const containerRef = useRef(null);
  const adapterRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState(filters.mapMode || "markers");
  const onViewStateRef = useRef(onViewState);

  const effectiveMode = filters.mapMode || mode;

  const refresh = useCallback(
    async (nextMode) => {
      const activeMode = nextMode || effectiveMode;
      setStatus("");
      if (!adapterRef.current) return;
      try {
        const response = await fetchMapPoints({
          filters,
          mode: activeMode,
          entity: "both"
        });
        adapterRef.current.setMode(activeMode);
        if (activeMode === "heatmap") {
          adapterRef.current.setHeatmap(response.points || []);
        } else {
          adapterRef.current.setMarkers(response.points || [], { onSelect });
        }
        if (response.truncated) {
          setStatus("Map truncated for performance. Narrow filters to see more.");
        } else if (!response.points || response.points.length === 0) {
          setStatus("No map points for current filters.");
        }
      } catch (error) {
        setStatus(`Map unavailable: ${error.message}`);
      }
    },
    [filters, onSelect, effectiveMode]
  );

  const scheduleResize = useCallback(() => {
    const resize = () => {
      if (typeof adapterRef.current?.map?.resize === "function") {
        adapterRef.current.map.resize();
      } else if (typeof adapterRef.current?.map?.invalidateSize === "function") {
        adapterRef.current.map.invalidateSize();
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(resize));
    setTimeout(resize, 100);
  }, []);

  const handleReset = useCallback(() => {
    if (!adapterRef.current) return;
    adapterRef.current.setBounds(SUSSEX_BOUNDS);
  }, []);

  useEffect(() => {
    onViewStateRef.current = onViewState;
  }, [onViewState]);

  useEffect(() => {
    if (!MAPBOX_ACCESS_TOKEN || !containerRef.current || adapterRef.current) return;

    const initialCenter = viewState?.center || SUSSEX_CENTER;
    const initialZoom =
      typeof viewState?.zoom === "number" ? viewState.zoom : DEFAULT_ZOOM;
    const shouldFitBounds = !viewState?.hasUserView;

    adapterRef.current = createMapAdapter(containerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      accessToken: MAPBOX_ACCESS_TOKEN,
      style: MAPBOX_STYLE
    });

    if (shouldFitBounds) {
      adapterRef.current.setBounds(SUSSEX_BOUNDS);
    }

    unsubscribeRef.current = adapterRef.current.onViewChange((nextView) => {
      onViewStateRef.current?.({ ...nextView, hasUserView: true });
    });

    scheduleResize();

    return () => {
      unsubscribeRef.current?.();
      adapterRef.current?.destroy?.();
      adapterRef.current = null;
    };
  }, [scheduleResize]);

  useEffect(() => {
    const handleResize = () => scheduleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [scheduleResize]);

  useEffect(() => {
    if (filters.mapMode && filters.mapMode !== mode) {
      setMode(filters.mapMode);
    }
  }, [filters.mapMode, mode]);

  useEffect(() => {
    if (!adapterRef.current) return;
    refresh(effectiveMode);
  }, [refresh, effectiveMode, refreshToken]);

  const panelTitle = useMemo(() => "Geographic Context", []);

  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <div className="map-section">
        <div className="panel-title">{panelTitle}</div>
        <div className="map-panel">
          <div className="map-status">
            Mapbox token missing. Set MAPBOX_ACCESS_TOKEN in the root .env file.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="map-section">
      <div className="panel-title">{panelTitle}</div>
      <div className="map-controls-row">
        <MapModeToggle
          value={effectiveMode}
          onChange={(next) => {
            setMode(next);
            onModeChange?.(next);
            refresh(next);
          }}
        />
        <button className="button small map-reset" type="button" onClick={handleReset}>
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
