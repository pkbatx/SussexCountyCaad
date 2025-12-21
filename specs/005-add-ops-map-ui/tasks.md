# Tasks: Operational Map UI

**Input**: Design documents from `/Users/pbuch/SussexCountyCaad/specs/005-add-ops-map-ui/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests/Validation**: Validation tasks are REQUIRED when changes touch ingestion, schema/migrations, grouping logic, or notifications. Other tests are optional unless explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and shared UI scaffolding

- [X] T001 Define Sussex map defaults and polling constants in `frontend/src/views/config.js`
- [X] T002 Wire config constants into polling/cache logic in `frontend/src/main.js`
- [X] T003 [P] Establish neutral dark palette tokens and layout primitives in `frontend/src/styles.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core API + UI plumbing required by all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Verify filter parsing (time window/type/jurisdiction/status/confidence) across endpoints in `backend/src/api/handlers/filters.js` and `backend/src/api/server.js`
- [X] T005 [P] Ensure map points query returns weighted coordinates and respects bounds in `backend/src/db/queries/map.js` and `backend/src/api/handlers/map.js`
- [X] T006 [P] Ensure summary metrics/trends/hotspots respect filters in `backend/src/db/queries/summaries.js` and `backend/src/api/handlers/summary.js`
- [X] T007 [P] Confirm feedback submission/list endpoints for calls/incidents in `backend/src/api/handlers/feedback.js`
- [X] T008 Update frontend API wrappers for map/summary/feedback filters in `frontend/src/api.js`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Operational console with map + feedback (Priority: P1) 🎯 MVP

**Goal**: Operators can filter calls/incidents, view synced map context, and submit feedback from detail views.

**Independent Test**: Apply filters, open a call/incident detail, submit feedback, and confirm list/map updates.

### Implementation for User Story 1

- [X] T009 [US1] Build filter panel UI and change handlers in `frontend/src/views/filters.js`
- [X] T010 [US1] Integrate filter panel into sidebar layout in `frontend/src/views/layout.js`
- [X] T011 [US1] Add paginated calls feed with status badges in `frontend/src/views/calls.js`
- [X] T012 [US1] Add paginated incidents feed with rollups and timestamps in `frontend/src/views/incidents.js`
- [X] T013 [US1] Show extraction/grouping details and feedback status in `frontend/src/views/call-detail.js`
- [X] T014 [US1] Show rollup history, grouping rationale, and feedback status in `frontend/src/views/incident-detail.js`
- [X] T015 [US1] Re-render list + map views on filter updates in `frontend/src/main.js`

**Checkpoint**: User Story 1 fully functional and independently testable

---

## Phase 4: User Story 2 - Heatmap + clustering + operational insights (Priority: P2)

**Goal**: Operators can toggle heatmap/markers, see clustered map points, and review summary metrics, trends, and hotspots.

**Independent Test**: Toggle heatmap vs markers and confirm summary metrics/hotspots update with filters.

### Implementation for User Story 2

- [X] T016 [US2] Implement provider abstraction for markers/heatmap/clustering in `frontend/src/views/map-adapter.js`
- [X] T017 [US2] Add Sussex County default view, map toggles, and sync status in `frontend/src/views/map.js`
- [X] T018 [US2] Apply recency-weighted intensity to heatmap points in `frontend/src/views/map-adapter.js`
- [X] T019 [US2] Render summary strip, trend chart, and hotspots for current filters in `frontend/src/views/summary.js`

**Checkpoint**: User Stories 1 and 2 work independently with shared filters

---

## Phase 5: User Story 3 - Responsive layout + realtime-ish updates (Priority: P3)

**Goal**: UI remains usable on mobile and stays fresh via lightweight polling without full reloads.

**Independent Test**: Resize to mobile and verify layout; observe list/map updates after refresh interval.

### Implementation for User Story 3

- [X] T020 [US3] Implement responsive grid + mobile layout rules in `frontend/src/styles.css`
- [X] T021 [US3] Add polling refresh behavior that preserves view state in `frontend/src/main.js`
- [X] T022 [US3] Add empty/loading/error states for list/map/detail panels in `frontend/src/views/calls.js`, `frontend/src/views/incidents.js`, `frontend/src/views/map.js`, `frontend/src/views/call-detail.js`, and `frontend/src/views/incident-detail.js`

**Checkpoint**: All user stories independently functional on desktop and mobile

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency, validation, and documentation

- [X] T023 [P] Align map marker/heatmap colors with neutral palette in `frontend/src/views/map-adapter.js`
- [X] T024 [P] Refine typography/borders/elevation for operational density in `frontend/src/styles.css`
- [X] T025 Validate quickstart scenarios and update `specs/005-add-ops-map-ui/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can proceed in parallel once Phase 2 completes
- **Polish (Final Phase)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational; no dependency on other stories
- **User Story 2 (P2)**: Starts after Foundational; depends on shared filters + map foundation
- **User Story 3 (P3)**: Starts after Foundational; builds on layout + polling foundation

### Within Each User Story

- Filters before feeds and map updates
- Map provider abstraction before map view wiring
- Summary widgets after filters and API wiring
- Detail feedback after feed/detail rendering exists

### Parallel Opportunities

- T003, T005, T006, T007, T023, and T024 can run in parallel
- Once Phase 2 completes, US2 and US3 can proceed alongside US1 if staffed

---

## Parallel Example: User Story 1

```bash
Task: "Build filter panel UI and change handlers in frontend/src/views/filters.js"
Task: "Add paginated calls feed with status badges in frontend/src/views/calls.js"
Task: "Add paginated incidents feed with rollups and timestamps in frontend/src/views/incidents.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate with quickstart scenarios

### Incremental Delivery

1. Setup + Foundational
2. User Story 1 → Validate
3. User Story 2 → Validate
4. User Story 3 → Validate
5. Polish pass

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. After Foundation:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
