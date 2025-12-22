# Implementation Plan: Normalized Agency Fields

**Branch**: `006-normalize-agency-fields` | **Date**: 2025-12-21 | **Spec**: /Users/pbuch/SussexCountyCaad/specs/006-normalize-agency-fields/spec.md
**Input**: Feature specification from `/Users/pbuch/SussexCountyCaad/specs/006-normalize-agency-fields/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Normalize agency, incident type, and location fields for operator-facing UI views while hiding model-centric
metadata. Agency becomes filename-derived and canonicalized via deterministic rules, with a registry for
consistent rendering and filtering. UI and APIs surface clean fields and simplified stage status only.

## Technical Context

**Language/Version**: JavaScript (Node.js >=20 backend, Vite frontend)
**Primary Dependencies**: Backend: better-sqlite3, ajv, dotenv. Frontend: vite, leaflet, leaflet.heat, leaflet.markercluster.
**Storage**: Local SQLite at `/Users/pbuch/SussexCountyCaad/runtime/data/caad.sqlite`
**Testing**: Node.js built-in test runner (`node --test`) for backend; manual UI verification for frontend.
**Target Platform**: Local macOS/Linux dev; modern browsers (Chrome/Firefox/Safari).
**Project Type**: Web application (backend + frontend)
**Performance Goals**: Agency normalization and UI rendering updates complete within 1s for up to ~500 recent calls.
**Constraints**: Local-first; deterministic, non-AI agency parsing; no model metadata in primary UI views; keep AI schema validation internal.
**Scale/Scope**: Local operator use; registry maintenance window 30 days without use.

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

Status: Pass (no violations anticipated).

## Project Structure

### Documentation (this feature)

```text
/Users/pbuch/SussexCountyCaad/specs/006-normalize-agency-fields/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
/Users/pbuch/SussexCountyCaad/backend/src/
├── api/
│   ├── handlers/
│   └── server.js
├── db/
├── ingest/
├── pipeline/
└── geo/

/Users/pbuch/SussexCountyCaad/frontend/src/
└── views/
```

**Structure Decision**: Web application with a Node backend (`backend/`) and Vite frontend (`frontend/`).

## Complexity Tracking

None.
