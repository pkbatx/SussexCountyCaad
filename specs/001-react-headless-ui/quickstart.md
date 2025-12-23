# Quickstart: Headless UI Frontend Migration

## Prerequisites

- Node.js 20+
- Access to the calls directory and SQLite database used by the backend
- Mapbox access token for map views

## Environment

Create or update `/Users/pbuch/SussexCountyCaad/.env` with:

```ini
CALLS_DIR=/absolute/path/to/calls
CAAD_DB_PATH=/Users/pbuch/SussexCountyCaad/runtime/data/caad.sqlite
MAPBOX_ACCESS_TOKEN=your_token_here
```

## Install Dependencies

```bash
npm --prefix /Users/pbuch/SussexCountyCaad/backend install
npm --prefix /Users/pbuch/SussexCountyCaad/frontend install
```

## Run Backend

```bash
npm --prefix /Users/pbuch/SussexCountyCaad/backend run dev
```

## Run Frontend

```bash
npm --prefix /Users/pbuch/SussexCountyCaad/frontend run dev
```

## Validate UI Parity

- Open the frontend dev URL from Vite output.
- Verify filters, calls list, incident board, map, audio playback, and detail views.
- Confirm SSE status and refresh behavior match the baseline UI.
- Verify hash routes (`#calls`, `#incidents`, `#call/{id}`, `#incident/{id}`, `#notifications`) deep-link correctly.
- Confirm map mode toggle switches between markers and heatmap and preserves pan/zoom.
- Check keyboard navigation and focus visibility for filters, toggles, and action buttons.
