# Implementation Plan: SSE + Mapbox Heatmap

**Branch**: `009-sse-mapbox-heatmap` | **Date**: 2025-12-22 | **Spec**: `specs/009-sse-mapbox-heatmap/spec.md`
**Input**: Feature specification from `/specs/009-sse-mapbox-heatmap/spec.md`

## Summary

Add a lightweight SSE refresh stream and migrate the UI map to a dark Mapbox
heatmap/marker view. Preserve map view state across updates while continuing to
refetch existing REST endpoints for calls, incidents, summary, and map points.

## Technical Context

**Language/Version**: Node.js 20 (backend), JavaScript (frontend)  
**Primary Dependencies**: Backend: better-sqlite3, ajv, dotenv; Frontend: Vite;
Mapbox GL JS (new, replaces Leaflet stack)  
**Storage**: SQLite (better-sqlite3)  
**Testing**: Node built-in test runner (`node --test`) for backend; manual UI
smoke checks via Vite  
**Target Platform**: Local macOS/Linux; modern browser  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: UI updates visible ≤3s, initial map load ≤5s,
heatmap/marker toggle ≤1s, map view stable across ≥50 updates  
**Constraints**: SSE emits refresh-only signals; no map recenter on refresh;
local-first operation; Mapbox token required  
**Scale/Scope**: Single-operator local system; low-to-moderate call volume
(tens–hundreds/day)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Gate 1: Local-first durability and idempotent pipeline with explicit migrations
  and audit trail for artifacts.
- Gate 2: Read-only calls input with deterministic content-hash call identity and
  no silent reprocessing.
- Gate 3: AI provider abstraction with OpenAI default; no provider specifics
  outside the AI layer and no local model runner required.
- Gate 4: Strict JSON schema validation for AI outputs with reject + repair
  retry, confidence scores, evidence references, and preserved uncertainty; geo
  is best-effort.
- Gate 5: Conservative, explainable incident grouping and incremental rollup
  summaries while preserving per-call history.
- Gate 6: Failure states and retry paths are visible and actionable.

Status: PASS (no deviations required for this feature).

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
backend/
├── src/
│   ├── ai/
│   ├── api/
│   ├── config/
│   ├── db/
│   ├── geo/
│   ├── ingest/
│   ├── notifications/
│   ├── pipeline/
│   └── services/
└── tests/
    └── integration/

frontend/
├── src/
│   ├── main.js
│   └── views/
└── index.html
```

**Structure Decision**: Web application with `backend/` and `frontend/` as above.

## Complexity Tracking

None.
