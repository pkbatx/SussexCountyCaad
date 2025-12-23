export const SUSSEX_CENTER = [41.1284, -74.6798];
export const SUSSEX_BOUNDS = [
  [40.876243, -75.02324],
  [41.380529, -74.336285]
];
export const DEFAULT_ZOOM = 9;
export const AUTO_RESOLVE_MINUTES = 20;
export const MONITOR_WINDOW_MINUTES = 10;
export const MAP_VIEW_STORAGE_KEY = "cad.map.view.v2";

export const DEFAULT_WINDOW_HOURS = 24;
export const DETAIL_CACHE_MS = 15000;
export const POLL_INTERVAL_MS = 20000;
export const TAG_NEW_WINDOW_MINUTES = 10;
export const TAG_UPDATED_WINDOW_MINUTES = 30;

export const SERVICE_TYPES = ["EMS", "Fire", "Special"];
export const OPERATIONAL_TAGS = [
  "New",
  "Updated",
  "Multi-Call",
  "Re-alert",
  "Unmapped",
  "Needs Attention"
];

export const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";
export const MAPBOX_STYLE =
  import.meta.env.VITE_MAPBOX_STYLE || "mapbox://styles/mapbox/navigation-night-v1";
