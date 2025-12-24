# Implementation Plan: Incident-Centric Cohesion UI

**Branch**: `002-incident-cohesion-ui` | **Date**: 2025-12-23 | **Spec**: /Users/pbuch/SussexCountyCaad/specs/002-incident-cohesion-ui/spec.md
**Input**: Feature specification from `/Users/pbuch/SussexCountyCaad/specs/002-incident-cohesion-ui/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command.

## Summary

Refocus the UI on incident-first monitoring with a 24-hour seconds clock, clear
incident-centric metrics, and call progression states that flow naturally into
incident drill-downs. Redesign digests and rollup history to be incident-level
and human-readable, replace internal confidence weights with user-facing tiers,
and refresh the audio player UI for clarity. Backend responses remain stable but
are adjusted to deliver incident-level summaries and readable signals without
full reloads.

## Technical Context

**Language/Version**: Node.js 20 (backend), React 18 + Vite (frontend)  
**Primary Dependencies**: better-sqlite3, ajv, dotenv, mapbox-gl,
@headlessui/react  
**Storage**: Local SQLite (`/Users/pbuch/SussexCountyCaad/runtime/data/caad.sqlite`)  
**Testing**: `npm test && npm run lint` (project standard)  
**Target Platform**: Local Node.js service + desktop browser (web app)  
**Project Type**: Web application (backend + frontend)  
**Performance Goals**: Incident updates visible within 10 seconds; header clock
updates every second; UI interactions remain responsive under active monitoring  
**Constraints**: Preserve existing workflows and API routes; avoid full reloads;
incident-first presentation with drill-down calls; no developer-only details in
user-facing UI  
**Scale/Scope**: County-scale operations console with hundreds of calls/incidents
per day and near-realtime updates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Operational clarity: UI reduces cognitive load and avoids competing counts.
- [x] Realtime perception: latency addressed; updates are incremental and continuous.
- [x] Incremental pipeline: ingestion unblocked; processing idempotent/resumable.
- [x] Transcript-grounded summaries: incident-aware, specific, traceable to sources.
- [x] AI discipline: small prompts, reuse/caching, fail-soft behavior.
- [x] Incident-first UX: calls are drill-downs; user-facing language only.
- [x] Mapping stability: padded bbox default; overlays optional; precision scales with zoom.
- [x] Reliability: observability present; explicit state; background lifecycles defined.
- [x] Evolvability: interfaces stable; no hard-coded geography/feed assumptions without rationale.

Post-design re-check: PASS (no violations identified).

## Project Structure

### Documentation (this feature)

```text
/Users/pbuch/SussexCountyCaad/specs/002-incident-cohesion-ui/
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

/Users/pbuch/SussexCountyCaad/frontend/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── state/
│   ├── api.js
│   ├── App.jsx
│   ├── config.js
│   ├── main.jsx
│   └── styles.css
```

**Structure Decision**: Web application with existing `backend/` and `frontend/`
modules; changes scoped to UI components, summary services, and incident/call
response shaping.
