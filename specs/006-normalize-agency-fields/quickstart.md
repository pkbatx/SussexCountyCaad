# Quickstart (Normalized Agency Fields)

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

1. **Agency normalization**
   - Ingest calls with variant agency filenames (e.g., Lakeland_EMS__Gen__*, Lakeland_EMS__Duty__*).
   - Confirm the UI shows a single canonical agency value.

2. **Unknown agency behavior**
   - Ingest a call without agency tokens.
   - Confirm agency displays as “Unknown” and is filterable.

3. **Simplified UI fields**
   - Open call and incident detail views.
   - Confirm no confidence/evidence metadata appears in primary views.

4. **Grouping signal policy**
   - Confirm grouping decisions do not override agency + location due to incident type alone.

## API smoke checks

```bash
curl "http://localhost:3000/api/calls?limit=5"
curl "http://localhost:3000/api/incidents?limit=5"
curl "http://localhost:3000/api/agencies"
```
