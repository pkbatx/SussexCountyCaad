# Implementation Plan: Realtime Pipeline & UI Updates

**Branch**: `010-realtime-pipeline-ui` | **Date**: 2025-12-22 | **Spec**: specs/010-realtime-pipeline-ui/spec.md
**Input**: Feature specification from `/specs/010-realtime-pipeline-ui/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Deliver transcript-grounded, progressively enriched incident summaries with realtime UI updates via incremental events. Keep the existing local-first SQLite model, add minimal lifecycle and filter support, and ensure backend-driven multi-select filters, time presets, and fast aggregates.

## Technical Context

**Language/Version**: Node.js 20 (backend) + browser JavaScript (frontend)
**Primary Dependencies**: better-sqlite3, ajv, dotenv (backend); Vite, mapbox-gl (frontend)
**Storage**: SQLite database + local filesystem for call audio/transcripts
**Testing**: Node.js built-in test runner (`node --test`) with integration tests
**Target Platform**: Local macOS/Linux
**Project Type**: Web application (backend + frontend)
**Performance Goals**: Calls visible <5s; filters/aggregates update <2s; summaries update <2 minutes of new transcript text
**Constraints**: Local-first, minimal dependencies, incremental updates only, avoid full reloads or heavy reprocessing
**Scale/Scope**: County-scale operations; hundreds to low thousands of calls per day; single-digit concurrent operators

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Gate 1: Local-first durability and idempotent pipeline with explicit migrations
  and audit trail for artifacts. **Pass**
- Gate 2: Read-only calls input with deterministic content-hash call identity and
  no silent reprocessing. **Pass**
- Gate 3: AI provider abstraction with OpenAI default; no provider specifics
  outside the AI layer and no local model runner required. **Pass**
- Gate 4: Strict JSON schema validation for AI outputs with reject + repair
  retry, confidence scores, evidence references, and preserved uncertainty; geo
  is best-effort. **Pass**
- Gate 5: Conservative, explainable incident grouping and incremental rollup
  summaries while preserving per-call history. **Pass**
- Gate 6: Failure states and retry paths are visible and actionable. **Pass**

## Project Structure

### Documentation (this feature)

```text
specs/010-realtime-pipeline-ui/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   └── handlers/
│   ├── db/
│   │   ├── migrations/
│   │   └── queries/
│   ├── ingest/
│   ├── pipeline/
│   │   └── stages/
│   └── services/
└── tests/
    └── integration/

frontend/
├── src/
│   ├── views/
│   ├── main.js
│   └── styles.css
└── tests/
```

**Structure Decision**: Option 2 (web application with backend + frontend).

## Complexity Tracking

No constitution violations required for this feature.

## Phase 0: Research (complete)

- Define incremental event payloads and SSE update strategy.
- Determine transcript-grounded summary update cadence and triggers.
- Establish lifecycle state transition defaults aligned with a ~20-minute window.
- Identify minimal indexing/queries required for multi-select filters and fast aggregates.

## Phase 1: Design & Contracts (complete)

- Data model updated for lifecycle timing, transcript-grounded summaries, and filterable fields.
- API contract extended to support realtime SSE updates and filtered feeds.
- Quickstart scenarios documented for realtime updates and progressive enrichment.

## Constitution Re-check (post-design)

All gates remain satisfied; changes are additive and local-first.
