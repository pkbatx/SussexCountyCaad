export const SUSSEX_CENTER = [41.172, -74.623];
export const SUSSEX_BOUNDS = [
  [40.83, -74.96],
  [41.38, -74.41]
];
export const DEFAULT_ZOOM = 10;

export const DEFAULT_WINDOW_HOURS = 24;
export const DETAIL_CACHE_MS = 15000;
export const POLL_INTERVAL_MS = 20000;

export const TILE_URL =
  import.meta.env.VITE_TILE_URL ||
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
