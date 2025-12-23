# Implementation Plan: Integrated UI + AI Upgrade

**Branch**: `007-ui-ai-upgrade` | **Date**: 2025-12-21 | **Spec**: `specs/007-ui-ai-upgrade/spec.md`
**Input**: Feature specification from `/specs/007-ui-ai-upgrade/spec.md`

## Summary

Deliver a CAD-inspired, three-column UI that surfaces deterministic incident insights and a redesigned extraction/grouping pipeline that produces normalized, UI-ready fields. Preserve local-first durability, strict JSON validation, conservative grouping, incremental rollups, and failure visibility while removing model-centric metadata from UI contracts.

## Technical Context

**Language/Version**: Node.js 20 (backend), Vite frontend (vanilla JS/HTML/CSS)  
**Primary Dependencies**: better-sqlite3, OpenAI SDK, existing frontend stack  
**Storage**: SQLite (local)  
**Testing**: node:test (integration)  
**Target Platform**: Local desktop/server runtime  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: UI filter/refresh under 5 seconds for standard windows  
**Constraints**: Local-first, read-only calls directory, strict JSON validation, no UI exposure of model metadata  
**Scale/Scope**: Single-county operations; bounded local dataset

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Gate 1: Local-first durability and idempotent pipeline with explicit migrations
  and audit trail for artifacts. **PASS**
- Gate 2: Read-only calls input with deterministic content-hash call identity and
  no silent reprocessing. **PASS**
- Gate 3: AI provider abstraction with OpenAI default; no provider specifics
  outside the AI layer and no local model runner required. **PASS**
- Gate 4: Strict JSON schema validation for AI outputs with reject + repair
  retry, confidence scores, evidence references, and preserved uncertainty; geo
  is best-effort. **PASS** (retain internal validation; hide in UI contract)
- Gate 5: Conservative, explainable incident grouping and incremental rollup
  summaries while preserving per-call history. **PASS**
- Gate 6: Failure states and retry paths are visible and actionable. **PASS**

## Project Structure

### Documentation (this feature)

```text
specs/007-ui-ai-upgrade/
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
│   ├── ai/
│   ├── api/
│   ├── db/
│   ├── geo/
│   ├── pipeline/
│   └── services/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/
```

**Structure Decision**: Use the existing `backend/` and `frontend/` layout; no new top-level packages.

## Complexity Tracking

No constitution violations introduced.

---

## Phase 0: Outline & Research

Completed: `specs/007-ui-ai-upgrade/research.md`

## Phase 1: Design & Contracts

### Data Model (specs/007-ui-ai-upgrade/data-model.md)

- **Call**: call_id, timestamps, agency_id, service_type, incident_type, address, town, cross_street, poi, re_alert_flag, incident_id
- **Incident**: incident_id, last_update_at, rollup_versions, call_count, re_alert_counts, attention_flags
- **Agency**: agency_id, canonical_name, service_type
- **Location**: normalized_address, town, poi, lat, lon, source (reference/geo)
- **InsightMetric**: metric_id, window_start, window_end, metric_type, value, group_key
- **FeedbackEvent**: feedback_id, target_type, target_id, feedback_type, created_at, applied_at
- **ReAlert**: derived fields per call/incident/agency

### Contracts (specs/007-ui-ai-upgrade/contracts/)

- `GET /api/agencies?window=...` → activity counts and filters
- `GET /api/incidents?filters=...` → incident cards + counts
- `GET /api/calls?filters=...` → call rows + incident mapping
- `GET /api/insights?window=...` → deterministic insights
- `GET /api/incidents/:id` → incident detail + rollup history
- `GET /api/calls/:id` → call detail + audio metadata
- `POST /api/feedback` → feedback submission

### Quickstart (specs/007-ui-ai-upgrade/quickstart.md)

- Seed sample calls, verify incident list, filter by agency, play audio, submit feedback, observe reprocessing.

### Agent context update

Run `.specify/scripts/bash/update-agent-context.sh codex` after Phase 1 outputs.

---

## Phase 2: Planning

Stop after Phase 2 and hand off to `/speckit.tasks`.
