# Implementation Plan: Headless UI Frontend Migration

**Branch**: `001-react-headless-ui` | **Date**: 2025-12-22 | **Spec**: /Users/pbuch/SussexCountyCaad/specs/001-react-headless-ui/spec.md  
**Input**: Feature specification from `/Users/pbuch/SussexCountyCaad/specs/001-react-headless-ui/spec.md`

## Summary

Migrate the existing Vite-based operations console UI to a React frontend using Headless UI patterns while preserving all current behaviors, routes, data flows, and visual layout, including map interactions, audio playback, and SSE/polling refresh.

## Technical Context

**Language/Version**: JavaScript (Node.js >= 20 backend, browser React frontend)  
**Primary Dependencies**: Vite, React, Headless UI, mapbox-gl; backend uses better-sqlite3, ajv, dotenv  
**Storage**: SQLite database via backend; read-only calls directory for audio assets  
**Testing**: No automated frontend tests configured; rely on manual parity validation for this migration  
**Target Platform**: Local web application in modern desktop browsers with Node.js API server  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: 95% of view transitions render usable content within 2 seconds under typical operational load  
**Constraints**: Preserve all baseline functionality, visual layout, and hash-based navigation; no backend or data pipeline changes  
**Scale/Scope**: Single operations console with existing calls/incidents/map/notifications workflows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Gate 1: Local-first durability and idempotent pipeline with explicit migrations and audit trail for artifacts.  
  Status: Pass (UI-only migration; no pipeline changes.)
- Gate 2: Read-only calls input with deterministic content-hash call identity and no silent reprocessing.  
  Status: Pass (No changes to ingestion or identity logic.)
- Gate 3: AI provider abstraction with OpenAI default; no provider specifics outside the AI layer and no local model runner required.  
  Status: Pass (UI-only change.)
- Gate 4: Strict JSON schema validation for AI outputs with reject + repair retry, confidence scores, evidence references, and preserved uncertainty; geo is best-effort.  
  Status: Pass (No AI output handling changes.)
- Gate 5: Conservative, explainable incident grouping and incremental rollup summaries while preserving per-call history.  
  Status: Pass (No grouping logic changes.)
- Gate 6: Failure states and retry paths are visible and actionable.  
  Status: Pass (UI parity requires existing error and retry visibility.)

Post-design review: Pass (research/design decisions do not modify pipeline, identity, or AI handling.)

## Project Structure

### Documentation (this feature)

```text
specs/001-react-headless-ui/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   ├── ai/
│   ├── config/
│   ├── db/
│   ├── geo/
│   ├── ingest/
│   ├── notifications/
│   ├── pipeline/
│   └── services/
└── tests/
    ├── fixtures/
    └── integration/

frontend/
├── src/
│   ├── views/
│   ├── api.js
│   ├── main.js
│   └── styles.css
└── vite.config.js
```

**Structure Decision**: Use the existing frontend/backend split. The React migration will evolve `frontend/src` into component/page-oriented modules while keeping the same Vite entrypoint and backend API surface.

## Complexity Tracking

No constitution gate violations.
