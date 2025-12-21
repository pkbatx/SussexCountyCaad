# Implementation Plan: SussexCountyCAAD Core Workflow

**Branch**: `001-define-caad-core` | **Date**: 2025-12-20 | **Spec**: /Users/pbuch/SussexCountyCaad/specs/001-define-caad-core/spec.md
**Input**: Feature specification from `/specs/001-define-caad-core/spec.md`

## Summary

Deliver a small, local-first system that ingests read-only radio-call audio,
computes deterministic call identities, processes calls through staged
pipelines, and exposes a local API with a Vite-powered UI. Keep dependencies
minimal (vanilla JS UI, minimal backend libraries), persist all artifacts in
SQLite, and encapsulate AI usage behind an adapter with OpenAI as the MVP
provider. Provide conservative incident grouping, incremental summaries, and
explicit failure visibility with safe retries.

## Modules & Responsibilities

- **Directory Watcher/Ingestion**: Detects new files, hashes content, creates
  call records, and enqueues stage tasks without mutating inputs.
- **Processing Pipeline**: Runs staged tasks (transcription, extraction,
  summarization, grouping, geo, notifications), records status/attempts/errors,
  and enforces idempotency.
- **AI Adapter**: Encapsulates provider calls (OpenAI for MVP), enforces strict
  JSON schemas, and handles repair retries.
- **Persistence Layer**: SQLite schema, migrations, and audit trails for all
  calls, stages, artifacts, AI invocations, incidents, and notifications.
- **Notifications**: Routes, deduplicates, and rate-limits outbound alerts to
  GroupMe/Discord with linkbacks.
- **Local API**: Exposes calls, incidents, artifacts, retry actions, and
  notification history to the UI.
- **Vite UI**: Client-side rendering of feeds and detail views with explicit
  status/error visibility and retry actions.

## Phased Rollout (End-to-End First)

1. **Skeleton + Local API + UI**: Minimal backend, SQLite schema/migrations,
   Vite UI shell, and local API for empty state.
2. **Ingestion Path**: File watcher → content hash → call record → visible in UI
   (end-to-end baseline).
3. **Transcription Stage**: AI transcription via adapter; store transcript and
   stage status; surface in UI.
4. **Metadata Extraction**: Strict JSON extraction with schema validation,
   confidence/evidence, repair-on-invalid-JSON.
5. **Incident Grouping + Rollups**: Conservative grouping logic, per-call
   history preserved, incremental incident summaries.
6. **Geocoding (Best-Effort)**: Optional geo enrichment with ambiguity retained.
7. **Notifications**: GroupMe/Discord routing with dedupe/rate limits and
   UI-visible delivery history.

## Key Decisions (Idempotency, Retries, Visibility)

- **Call Identity**: SHA-256 of audio content; used as stable `call_id` and
  dedupe key. Duplicate content creates no new call record.
- **Task Tracking**: Per-call stage table with status, attempts, timestamps,
  and last error; stage runs recorded for audit.
- **Retry Semantics**: Manual or automated retry creates a new stage run tied
  to the same call and stage; deterministic inputs ensure idempotent output.
- **Failure Visibility**: UI shows stage statuses, last error, attempt history,
  and retry controls for calls and incidents.
- **Grouping Strategy**: Group by normalized address when available, otherwise
  incident ID or strong signals; require confidence threshold and record
  grouping evidence.
- **Summaries**: Per-call summary plus incident rollup summary stored as
  append-only artifacts with versioning.

## Technical Context

**Language/Version**: JavaScript (Node.js 20 LTS) for backend; vanilla JS for UI  
**Primary Dependencies**: Vite (UI), SQLite driver (better-sqlite3), Ajv (JSON schema validation)  
**Storage**: Local SQLite database; read-only audio files in mounted calls directory  
**Testing**: Node built-in test runner for backend; manual UI validation and simple smoke scripts  
**Target Platform**: Local macOS/Linux workstation or server  
**Project Type**: Web app with local API + Vite frontend  
**Performance Goals**: New calls appear in UI within 1 minute; UI list renders within 1 second for 1k calls  
**Constraints**: Local-first, minimal dependencies, read-only calls input, no audio upload to third-party storage, explicit migrations and audit trails  
**Scale/Scope**: Single instance, single operator, up to 10k calls persisted

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

## Project Structure

### Documentation (this feature)

```text
specs/001-define-caad-core/
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
│   ├── api/             # Local HTTP API
│   ├── ai/              # Provider adapter + schema validation
│   ├── config/          # Env parsing + defaults
│   ├── db/              # SQLite access + migrations
│   ├── ingest/          # Directory watching + hashing
│   ├── notifications/   # GroupMe/Discord routing
│   ├── pipeline/        # Stage orchestration + retries
│   ├── domain/          # Entities + mapping helpers
│   └── util/            # Shared utilities
└── tests/
    ├── integration/
    └── unit/

frontend/
├── index.html
├── src/
│   ├── main.js
│   ├── styles.css
│   └── views/           # UI views and rendering helpers
└── public/
```

**Structure Decision**: Use a two-directory web app layout to keep the local
API/pipeline separated from the Vite UI while sharing minimal configuration.

## Complexity Tracking

No constitution violations identified.

## Post-Design Constitution Check

All gates remain satisfied based on the Phase 1 design artifacts.
