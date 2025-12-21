# Implementation Plan: Extraction & Grouping Accuracy v2

**Branch**: `002-improve-extraction-grouping` | **Date**: 2025-12-20 | **Spec**: /Users/pbuch/SussexCountyCaad/specs/002-improve-extraction-grouping/spec.md
**Input**: Feature specification from `/Users/pbuch/SussexCountyCaad/specs/002-improve-extraction-grouping/spec.md`

## Summary

Improve extraction, grouping, and rollup stability while preserving the existing
staged pipeline, SQLite persistence, strict JSON enforcement, and UI surfaces.
Introduce v2 extraction and grouping schemas with evidence-backed confidence,
conservative grouping decisions, and append-only incident rollups. Keep the
OpenAI adapter and repair-loop behavior intact but tighten schema validation and
failure visibility.

## Modules & Responsibilities

- **AI Adapter**: Add v2 extraction and grouping schemas, enforce JSON-only
  outputs, and run repair retries when invalid.
- **Pipeline Stages**: Update extraction and grouping stages to emit v2 payloads
  with evidence and confidence; record raw outputs on failure.
- **Candidate Selection**: Select a limited candidate set for grouping based on
  time window and signals before the AI decision.
- **Rollups**: Append new incident rollup artifacts for each update; keep prior
  versions immutable.
- **Persistence**: Store v2 artifacts with schema versions, references to AI
  invocations, and evidence spans.
- **UI Surfaces**: Continue to show existing call and incident views while
  exposing evidence and requires_review flags without breaking existing routes.

## Phased Rollout

1. **Schema + Validation Update**: Add v2 schemas and validation rules for
   extraction and grouping, including evidence requirements.
2. **Candidate Selection**: Implement and validate candidate set logic before
   grouping AI calls.
3. **Stage Integration**: Update extraction and grouping stages to write v2
   outputs, record failures, and keep retry semantics.
4. **Rollup Stability**: Update rollup generation to append new versions and
   preserve history.
5. **UI Verification**: Confirm UI can surface v2 payloads and review flags
   without breaking existing displays.
6. **Test Set**: Add labeled transcripts for regression and accuracy checks.

## Key Decisions

- **Evidence-first extraction**: Every non-null field must have evidence with
  per-field confidence; unknowns are null or empty with low confidence.
- **Conservative grouping**: Low-confidence merges set requires_review and
  default to new incidents unless explicit incident ID evidence exists.
- **Repair loop**: Up to three attempts total (initial plus two repair retries),
  with raw outputs stored on failure.
- **Rollup immutability**: Rollups are append-only and tied to the included call
  set for traceability.

## Technical Context

**Language/Version**: JavaScript (Node.js 20 LTS) for backend; vanilla JS for UI
**Primary Dependencies**: Ajv (JSON schema validation), better-sqlite3
**Storage**: Local SQLite database; read-only audio files in mounted calls directory
**Testing**: Node built-in test runner; labeled transcript fixtures for extraction and grouping
**Target Platform**: Local macOS/Linux workstation or server
**Project Type**: Web app with local API + Vite frontend
**Performance Goals**: Extraction and grouping complete within 2 minutes per call in normal load
**Constraints**: Local-first, minimal dependencies, strict JSON validation, no call input mutation
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
/Users/pbuch/SussexCountyCaad/specs/002-improve-extraction-grouping/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
/Users/pbuch/SussexCountyCaad/backend/
/Users/pbuch/SussexCountyCaad/frontend/
```

**Structure Decision**: Maintain the existing backend and Vite UI split; limit
changes to schema, pipeline stages, and UI display of v2 artifacts.

## Complexity Tracking

No constitution violations identified.

## Post-Design Constitution Check

All gates remain satisfied based on the Phase 1 design artifacts.
