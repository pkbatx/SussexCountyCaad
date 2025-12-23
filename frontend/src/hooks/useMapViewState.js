import { useCallback, useState } from "react";
import { MAP_VIEW_STORAGE_KEY, SUSSEX_BOUNDS } from "../config";

function withinBounds(center, bounds) {
  if (!Array.isArray(center) || center.length !== 2 || !Array.isArray(bounds)) {
    return false;
  }
  const [lat, lon] = center;
  return (
    lat >= bounds[0][0] &&
    lat <= bounds[1][0] &&
    lon >= bounds[0][1] &&
    lon <= bounds[1][1]
  );
}

function loadMapViewState() {
  try {
    const raw = window.localStorage.getItem(MAP_VIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.center || typeof parsed.zoom !== "number") return null;
    if (!withinBounds(parsed.center, SUSSEX_BOUNDS)) return null;
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

export function useMapViewState() {
  const [viewState, setViewState] = useState(loadMapViewState);

  const updateViewState = useCallback((next) => {
    if (!next?.center || typeof next.zoom !== "number") return;
    const snapshot = { ...next, hasUserView: true };
    setViewState(snapshot);
    storeMapViewState(snapshot);
  }, []);

  return { viewState, updateViewState };
}
