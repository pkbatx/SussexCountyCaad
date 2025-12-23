# Tasks: Integrated UI + AI Upgrade

**Input**: Design documents from `/specs/007-ui-ai-upgrade/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests/Validation**: Validation tasks are REQUIRED when changes touch
ingestion, schema/migrations, grouping logic, or notifications. Other tests are
optional unless explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Add re-alert window and UI contract defaults in `backend/src/config/env.js`
- [x] T002 [P] Define service type and tag constants in `frontend/src/views/config.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create migration for normalized agency/service type, re-alert fields, and insight aggregates in `backend/src/db/migrations/008_ui_ai_upgrade.sql`
- [x] T004 Update call/incident query shapes for normalized fields and re-alert metrics in `backend/src/db/queries/calls.js` and `backend/src/db/queries/incidents.js`
- [x] T005 Update agency and summary queries for normalized service types and counts in `backend/src/db/queries/agencies.js` and `backend/src/db/queries/summaries.js`
- [x] T010 [P] Add integration test for normalized extraction output in `backend/tests/integration/normalized_extraction.test.js`
- [x] T011 [P] Add integration test for re-alert computation in `backend/tests/integration/re_alerts.test.js`
- [x] T012 [P] Add integration test for insight aggregation in `backend/tests/integration/insights_aggregates.test.js`
- [x] T006 Implement deterministic agency + service type extraction in `backend/src/pipeline/agency-normalizer.js` and persist in `backend/src/pipeline/stages/extraction.js`
- [x] T007 Implement re-alert computation helper in `backend/src/pipeline/re-alert.js` and integrate in `backend/src/pipeline/stages/grouping.js`
- [x] T008 Add deterministic insight aggregation service in `backend/src/services/insights.js` and query helpers in `backend/src/db/queries/insights.js`
- [x] T009 Update API handlers to return normalized UI-facing payloads in `backend/src/api/handlers/calls.js`, `backend/src/api/handlers/incidents.js`, and `backend/src/api/handlers/summary.js`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Triage Incidents with Clean, Normalized Data (Priority: P1) 🎯 MVP

**Goal**: Deliver a three-column operational UI with normalized incident/call data and persistent audio playback.

**Independent Test**: Ingest a call and confirm incident card fields, audio playback, and map context render without model metadata.

### Implementation for User Story 1

- [ ] T013 [P] Build three-column layout shell and persistent regions in `frontend/src/views/layout.js` and `frontend/src/styles.css`
- [x] T013 [P] Build three-column layout shell and persistent regions in `frontend/src/views/layout.js` and `frontend/src/styles.css`
- [x] T014 [P] Implement agencies/activity column with multi-select filters in `frontend/src/views/filters.js` and `frontend/src/views/summary.js`
- [x] T015 [US1] Render incident cards with normalized fields and tags in `frontend/src/views/incidents.js`
- [x] T016 [P] Render calls list toggle with normalized fields in `frontend/src/views/calls.js` and `frontend/src/main.js`
- [x] T017 [US1] Add persistent audio player component in `frontend/src/views/audio-player.js` and wire to `frontend/src/views/call-detail.js`
- [x] T018 [US1] Update incident detail to hide model metadata and show normalized fields in `frontend/src/views/incident-detail.js`
- [x] T019 [US1] Update map column to show validated coordinates and toggle heatmap/markers in `frontend/src/views/map.js` and `frontend/src/views/map-adapter.js`
- [x] T020 [US1] Align API client to normalized payloads in `frontend/src/api.js`

**Checkpoint**: User Story 1 should be fully functional and independently testable

---

## Phase 4: User Story 2 - Operational Awareness with Deterministic Insights (Priority: P2)

**Goal**: Surface explainable insight counts, re-alert indicators, and attention flags without generated narratives.

**Independent Test**: Ingest multiple calls and verify insight strip, re-alert tags, and attention flags update deterministically.

### Implementation for User Story 2

- [x] T021 [US2] Expose insight metrics API in `backend/src/api/handlers/summary.js` and `backend/src/api/handlers/agencies.js`
- [x] T022 [US2] Add re-alert tags and counts to incident cards in `frontend/src/views/incidents.js`
- [x] T023 [US2] Implement insights strip and hotspot lists in `frontend/src/views/summary.js`
- [x] T024 [US2] Wire filters to insights and map context in `frontend/src/views/filters.js` and `frontend/src/views/map.js`

**Checkpoint**: User Stories 1 and 2 should be independently functional

---

## Phase 5: User Story 3 - Lightweight Feedback for Corrections (Priority: P3)

**Goal**: Provide fast feedback actions that update UI immediately and queue targeted reprocessing.

**Independent Test**: Submit feedback on a call or incident and confirm UI state changes and reprocessing is queued.

### Implementation for User Story 3

- [x] T025 [US3] Add feedback controls to call detail in `frontend/src/views/call-detail.js`
- [x] T026 [US3] Add feedback controls to incident detail in `frontend/src/views/incident-detail.js`
- [x] T027 [US3] Wire feedback submission and optimistic UI updates in `frontend/src/api.js` and `frontend/src/main.js`
- [x] T028 [US3] Queue targeted reprocessing in `backend/src/api/handlers/feedback.js` and `backend/src/pipeline/runner.js`
- [x] T029 [P] [US3] Add integration test for feedback flow in `backend/tests/integration/feedback_flow.test.js`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T030 [P] Update quickstart validation steps in `specs/007-ui-ai-upgrade/quickstart.md`
- [x] T031 [P] Update API contracts summary in `specs/007-ui-ai-upgrade/contracts/README.md`
- [ ] T032 [P] Run quickstart.md validation checklist in `specs/007-ui-ai-upgrade/quickstart.md`
- [x] T033 [P] Switch map tiles to dark mode and style Leaflet controls in `frontend/src/views/config.js`, `frontend/src/views/map.js`, `frontend/src/views/map-adapter.js`, `frontend/src/styles.css`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1 surfaces
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent but relies on UI detail views

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
Task: "Build three-column layout shell in frontend/src/views/layout.js"
Task: "Implement agencies/activity column in frontend/src/views/filters.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories
