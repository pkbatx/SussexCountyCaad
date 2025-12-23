# Quickstart: SSE + Mapbox Heatmap

## Prerequisites
- Node.js 20+
- Mapbox access token (set `MAPBOX_ACCESS_TOKEN` in `.env`; frontend and backend
  use the same value)

## Run locally

```bash
npm run dev:backend
npm run dev:frontend
```

Open the UI (Vite default): `http://localhost:5173`

## Verification checklist
- SSE connection indicator shows connected.
- Calls/incidents refresh without full page reload.
- Map loads with a dark basemap and fits Sussex County on first load.
- After panning/zooming, updates do not recenter the map.
- Heatmap/marker toggle switches within 1 second.

## Troubleshooting
- If the map is blank, verify `MAPBOX_ACCESS_TOKEN` is set and valid.
- If the SSE indicator is disconnected, confirm the backend is running and
  the SSE endpoint is reachable.
