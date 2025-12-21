# Quickstart: Extraction & Grouping Accuracy v2

## Preconditions

- Backend and frontend dependencies installed.
- Runtime directories exist:
  - /Users/pbuch/SussexCountyCaad/runtime/calls
  - /Users/pbuch/SussexCountyCaad/runtime/data
- Environment configured in /Users/pbuch/SussexCountyCaad/.env

## Run

1. Start backend:
   - From /Users/pbuch/SussexCountyCaad run `npm run dev:backend`
2. Start frontend:
   - From /Users/pbuch/SussexCountyCaad run `npm run dev:frontend`

## Validate Extraction v2

1. Add a sample audio file to /Users/pbuch/SussexCountyCaad/runtime/calls.
2. Wait for processing to complete.
3. Open call detail in the UI and confirm:
   - Extraction payload schema_version is extraction.v2.
   - Non-null fields have evidence items and per-field confidence.
   - Unknown fields are null or empty with low confidence.

## Validate Grouping v2

1. Add two calls referencing the same incident (or matching incident ID).
2. Confirm grouping decision schema_version is grouping.v2.
3. Confirm signals list is populated and requires_review is true when confidence is low.

## Validate Rollup Stability

1. Add another related call for the same incident.
2. Confirm incident rollup adds a new version and previous rollups remain visible.

## Labeled Transcript Set

1. Place labeled transcripts in `backend/tests/fixtures/extraction-v2/`.
2. Place grouping fixtures in `backend/tests/fixtures/grouping-v2/`.
3. Run validation tests:
   - `node --test backend/tests/integration/extraction-v2.test.js`
   - `node --test backend/tests/integration/grouping-v2.test.js`
   - `node --test backend/tests/integration/rollup-v2.test.js`
4. Compare outputs to expected fields and confidence bands.
