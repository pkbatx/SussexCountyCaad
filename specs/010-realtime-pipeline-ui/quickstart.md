# Quickstart: Realtime Pipeline & UI Updates

## Prerequisites

- Node.js 20+
- Local `.env` configured for backend and frontend

## Run

1) Start backend:

```bash
npm run dev:backend
```

2) Start frontend:

```bash
npm --prefix frontend run dev
```

3) Open UI:

- http://localhost:5173 (or the Vite port shown in terminal)

## Verification Scenarios

1) **Progressive enrichment**
- Drop a new call file into the calls directory.
- Confirm it appears immediately in the UI with partial fields.
- Confirm transcript-based summaries improve as transcription completes.

2) **Realtime updates**
- Keep the UI open and watch call/incident updates without manual refresh.

3) **Filters + time presets**
- Apply agency/town/status filters and confirm feeds + counts update.
- Switch time presets (15m/1h/6h/24h) and confirm feed boundaries.

4) **Lifecycle states**
- Observe incident status transitions (Active → Monitoring → Responded).
