---

description: "Task list for SSE + Mapbox Heatmap"
---

# Tasks: SSE + Mapbox Heatmap

**Input**: Design documents from `/specs/009-sse-mapbox-heatmap/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests/Validation**: Validation tasks are REQUIRED when changes touch ingestion, schema/migrations, grouping logic, or notifications. Other tests are optional unless explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and shared dependencies

- [X] T001 [P] Update frontend dependencies to use Mapbox GL JS in `frontend/package.json`
- [X] T002 Add Mapbox GL CSS import in `frontend/src/main.js` or `frontend/src/styles.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [X] T003 Create SSE event broker in `backend/src/services/events.js`
- [X] T004 Wire SSE endpoint handler in `backend/src/api/handlers/events.js` and route in `backend/src/api/server.js`
- [X] T005 Emit refresh events from `backend/src/ingest/ingest.js` and `backend/src/pipeline/stage-runner.js`

**Checkpoint**: SSE refresh channel available and emits events on call/stage changes

---

## Phase 3: User Story 1 - Live Updates Without Disruption (Priority: P1) 🎯 MVP

**Goal**: Live updates via SSE without losing the operator’s view state

**Independent Test**: Trigger updates and verify UI refreshes without map recentering and shows SSE status

### Implementation for User Story 1

- [X] T006 [US1] Add SSE client and refresh handler in `frontend/src/main.js` (replace polling)
- [X] T007 [US1] Add SSE connection status indicator in `frontend/src/views/layout.js`
- [X] T008 [US1] Style SSE status indicator in `frontend/src/styles.css`
- [X] T009 [US1] Preserve map view state across refreshes in `frontend/src/views/map.js`

**Checkpoint**: SSE-driven refresh works; map view stays stable across updates

---

## Phase 4: User Story 2 - Dark Mapbox Heatmap Context (Priority: P2)

**Goal**: Dark Mapbox map with heatmap/marker modes focused on Sussex County

**Independent Test**: Load map, confirm Sussex bounds on first load, toggle heatmap/markers without recenter

### Implementation for User Story 2

- [X] T010 [US2] Replace Leaflet adapter with Mapbox GL JS in `frontend/src/views/map-adapter.js`
- [X] T011 [US2] Add Mapbox config (token/style/bounds) in `frontend/src/views/config.js`
- [X] T012 [US2] Update `frontend/src/views/map.js` to use Mapbox adapter and toggles
- [X] T013 [US2] Ensure initial Sussex bounds apply once and are not reapplied on refresh in `frontend/src/views/map.js`

**Checkpoint**: Dark Mapbox map renders with heatmap/marker toggles and stable view state

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and documentation

- [X] T014 [P] Remove Leaflet-specific styling/imports from `frontend/src/styles.css`
- [X] T015 [P] Verify quickstart steps remain accurate in `specs/009-sse-mapbox-heatmap/quickstart.md`
- [X] T016 [P] Add SSE broker test in `backend/tests/integration/events.test.js`
- [X] T017 [P] Use single Mapbox token in backend config `backend/src/config/env.js` and update quickstart
- [X] T018 [P] Move calls/incidents toggle to header in `frontend/src/main.js` and `frontend/src/views/layout.js`
- [X] T019 [P] Derive call status from stage statuses in `backend/src/db/queries/calls.js`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational completion
- **Polish (Phase 5)**: Depends on User Stories completion

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Phase 2; no dependencies on US2
- **User Story 2 (P2)**: Starts after Phase 2; independent from US1 but benefits from SSE refresh stability

### Parallel Opportunities

- T001 can run in parallel with T003 (frontend vs backend)
- T014 and T015 can run in parallel (independent files)

---

## Parallel Example: User Story 1

```bash
Task: "Add SSE client and refresh handler in frontend/src/main.js"
Task: "Add SSE connection status indicator in frontend/src/views/layout.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Confirm SSE refresh and stable map view

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Validate live refresh without recenter
3. Add User Story 2 → Validate dark Mapbox heatmap + markers
4. Polish → Cleanup and quickstart validation
