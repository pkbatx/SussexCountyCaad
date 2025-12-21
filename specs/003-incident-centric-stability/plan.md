# Implementation Plan: Incident-Centric Stability

**Branch**: `003-incident-centric-stability` | **Date**: 2025-12-20 | **Spec**: [spec](spec.md)
**Input**: Feature specification from `/specs/003-incident-centric-stability/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Deliver incident-first workflows with append-only rollup history, conservative and
explainable grouping, grounded extraction using local reference data when present,
incident-aware notification deduping, and lightweight feedback signals that adjust
behavior without changing providers or storage.

## Technical Context

**Language/Version**: Node.js (>=20) for backend; Vite-managed frontend with vanilla JS  
**Primary Dependencies**: Backend: better-sqlite3, ajv, dotenv; Frontend: Vite (dev)  
**Storage**: Local SQLite database  
**Testing**: Node.js built-in `node --test`  
**Target Platform**: Local desktop/server (macOS/Linux)  
**Project Type**: Web application (backend + frontend)  
**Performance Goals**: Near-real-time updates for local operator workflow (seconds, not minutes)  
**Constraints**: Local-first, read-only calls input, strict JSON validation with repair,
conservative grouping, append-only rollups, incident-level notification dedupe,
provider abstraction maintained  
**Scale/Scope**: Single-instance local deployment; low to moderate call volume

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

Status: Pass (initial)  
Post-design re-check: Pass

## Project Structure

### Documentation (this feature)

```text
specs/003-incident-centric-stability/
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
│   ├── ai/
│   ├── api/
│   ├── config/
│   ├── db/
│   ├── ingest/
│   ├── notifications/
│   └── pipeline/
└── tests/
    ├── fixtures/
    └── integration/

frontend/
└── src/
    ├── api.js
    ├── main.js
    ├── styles.css
    └── views/
```

**Structure Decision**: Option 2 (backend + frontend web application).

## Complexity Tracking

No violations.
