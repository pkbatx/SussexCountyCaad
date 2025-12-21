# Quickstart (Ops Map UI)

## Prerequisites
- Node.js >=20
- Backend `.env` configured for local runtime

## Run the app

```bash
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend
```

Open `http://localhost:5173` (or Vite’s printed URL).

## Verification scenarios

1. **Map + filters**
   - Set a time window and min confidence.
   - Confirm calls/incidents lists and map points update together.

2. **Heatmap + clustering**
   - Toggle from markers to heatmap and back.
   - Zoom out to see clustering and back in to individual points.

3. **Summary + hotspots**
   - Confirm summary strip counts align with list totals.
   - Review trend chart and hotspots for the same filter context.

4. **Feedback path**
   - Open a call or incident detail view.
   - Submit feedback (wrong location/type/grouping).
   - Confirm immediate UI state change and queued reprocessing indicator.

## API smoke checks

```bash
curl "http://localhost:3000/api/calls?limit=5"
curl "http://localhost:3000/api/incidents?limit=5"
curl "http://localhost:3000/api/map/points?mode=markers&entity=both"
curl "http://localhost:3000/api/summary"
```

## Validation

- Verified quickstart scenarios on 2025-12-21.
