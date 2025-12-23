# SussexCountyCaad Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-20

## Active Technologies
- JavaScript (Node.js 20 LTS) for backend; vanilla JS for UI + Ajv (JSON schema validation), better-sqlite3 (002-improve-extraction-grouping)
- Local SQLite database; read-only audio files in mounted calls directory (002-improve-extraction-grouping)
- Node.js (>=20) for backend; Vite-managed frontend with vanilla JS + Backend: better-sqlite3, ajv, dotenv; Frontend: Vite (dev) (003-incident-centric-stability)
- Node.js >=20 (backend); JavaScript + Vite (frontend) + Backend: better-sqlite3, ajv, dotenv; Frontend: Vite, (005-add-ops-map-ui)
- JavaScript (Node.js >=20 backend, Vite frontend) + Backend: better-sqlite3, ajv, dotenv. Frontend: vite, leaflet, leaflet.heat, leaflet.markercluster. (005-add-ops-map-ui)
- Local SQLite at `/Users/pbuch/SussexCountyCaad/runtime/data/caad.sqlite` (005-add-ops-map-ui)
- Node.js 20 (backend), Vite frontend (vanilla JS/HTML/CSS) + better-sqlite3, OpenAI SDK, existing frontend stack (007-ui-ai-upgrade)
- SQLite (local) (007-ui-ai-upgrade)
- Node.js 20 (backend), JavaScript (frontend) + Backend: better-sqlite3, ajv, dotenv; Frontend: Vite; (009-sse-mapbox-heatmap)
- SQLite (better-sqlite3) (009-sse-mapbox-heatmap)
- Node.js 20 (backend) + browser JavaScript (frontend) + better-sqlite3, ajv, dotenv (backend); Vite, mapbox-gl (frontend) (010-realtime-pipeline-ui)
- SQLite database + local filesystem for call audio/transcripts (010-realtime-pipeline-ui)
- JavaScript (Node.js >= 20 backend, browser React frontend) + Vite, React, Headless UI, mapbox-gl; backend uses better-sqlite3, ajv, dotenv (001-react-headless-ui)
- SQLite database via backend; read-only calls directory for audio assets (001-react-headless-ui)

- JavaScript (Node.js 20 LTS) for backend; vanilla JS for UI + Vite (UI), SQLite driver (better-sqlite3), Ajv (JSON schema validation) (001-define-caad-core)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

JavaScript (Node.js 20 LTS) for backend; vanilla JS for UI: Follow standard conventions

## Recent Changes
- 001-react-headless-ui: Added JavaScript (Node.js >= 20 backend, browser React frontend) + Vite, React, Headless UI, mapbox-gl; backend uses better-sqlite3, ajv, dotenv
- 010-realtime-pipeline-ui: Added Node.js 20 (backend) + browser JavaScript (frontend) + better-sqlite3, ajv, dotenv (backend); Vite, mapbox-gl (frontend)
- 009-sse-mapbox-heatmap: Added Node.js 20 (backend), JavaScript (frontend) + Backend: better-sqlite3, ajv, dotenv; Frontend: Vite;


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
