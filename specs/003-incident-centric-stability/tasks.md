---

description: "Task list template for feature implementation"
---

# Tasks: Incident-Centric Stability

**Input**: Design documents from `/specs/003-incident-centric-stability/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests/Validation**: Validation tasks are REQUIRED when changes touch
ingestion, schema/migrations, grouping logic, or notifications. Other tests are
optional unless explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Define incident-centric config defaults in `backend/src/config/env.js` and `.env.example`
- [X] T002 [P] Add query module stubs for new tables in `backend/src/db/queries/grouping_decisions.js`, `backend/src/db/queries/reference_data.js`, and `backend/src/db/queries/feedback.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create migration `backend/src/db/migrations/003_incident_centric.sql` for grouping decisions, feedback signals, and reference data tables with indexes
- [X] T004 Update incident/rollup queries for incident feed ordering and rollup history in `backend/src/db/queries/incidents.js` and `backend/src/db/queries/rollups.js`
- [X] T005 [P] Add migration validation test in `backend/tests/integration/migrations_incident_centric.test.js`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Incident-centric monitoring (Priority: P1) 🎯 MVP

**Goal**: Provide incident-first views with append-only rollup history and explainable grouping.

**Independent Test**: Ingest multiple calls for one incident and verify a stable incident view with rollup history and grouping explanations.

### Tests for User Story 1 (REQUIRED)

- [X] T006 [P] [US1] Add integration test for incident detail rollup history in `backend/tests/integration/incidents_rollups.test.js`

### Implementation for User Story 1

- [X] T007 [US1] Persist full grouping decisions in `backend/src/pipeline/stages/grouping.js` using `backend/src/db/queries/grouping_decisions.js`
- [X] T008 [US1] Append rollup versions with grouping context in `backend/src/pipeline/stages/incident-summary.js` and `backend/src/db/queries/rollups.js`
- [X] T009 [US1] Return rollups, grouping explanations, and member calls in `backend/src/api/handlers/incidents.js`
- [X] T010 [US1] Update incident feed/detail UI in `frontend/src/views/incidents.js`, `frontend/src/views/incident-detail.js`, `frontend/src/views/layout.js`, and `frontend/src/styles.css`

**Checkpoint**: User Story 1 is fully functional and testable independently

---

## Phase 4: User Story 2 - Grounded metadata extraction (Priority: P2)

**Goal**: Use local reference candidates to ground extraction and preserve unknowns when evidence is weak.

**Independent Test**: Run extraction with and without reference candidates and verify evidence-backed fields and unknowns.

### Tests for User Story 2 (REQUIRED)

- [X] T011 [P] [US2] Add extraction reference fixtures in `backend/tests/fixtures/reference_data.json` and transcript samples in `backend/tests/fixtures/transcripts/`
- [X] T012 [P] [US2] Add integration test for reference-grounded extraction in `backend/tests/integration/extraction_reference_data.test.js`

### Implementation for User Story 2

- [X] T013 [US2] Implement reference data lookup in `backend/src/db/queries/reference_data.js`
- [X] T014 [US2] Include reference candidates in prompts and enforce candidate preference in `backend/src/pipeline/stages/extraction.js`

**Checkpoint**: User Story 2 is independently testable and improves extraction consistency

---

## Phase 5: User Story 3 - Incident-aware notifications (Priority: P3)

**Goal**: Deduplicate notifications by incident and send only meaningful updates.

**Independent Test**: Simulate multiple calls for one incident and confirm deduped notifications with suppression logs.

### Tests for User Story 3 (REQUIRED)

- [X] T015 [P] [US3] Add integration test for incident notification dedupe in `backend/tests/integration/notifications_incident_dedupe.test.js`

### Implementation for User Story 3

- [X] T016 [US3] Update incident-level dedupe and significant-update logic in `backend/src/notifications/rules.js`
- [X] T017 [US3] Persist dedupe keys and suppression reasons in `backend/src/pipeline/stages/notification.js` and `backend/src/db/queries/notifications.js`
- [X] T018 [US3] Update notification UI to show incident-level events in `frontend/src/views/notifications.js`

**Checkpoint**: User Story 3 is independently testable and reduces alert noise

---

## Phase 6: User Story 4 - Feedback and correction signals (Priority: P4)

**Goal**: Record contradiction-based feedback and apply bounded adjustments.

**Independent Test**: Introduce a contradiction and verify feedback capture and bounded adjustment behavior.

### Tests for User Story 4 (REQUIRED)

- [X] T019 [P] [US4] Add integration test for feedback signals in `backend/tests/integration/feedback_signals.test.js`

### Implementation for User Story 4

- [X] T020 [US4] Implement feedback signal persistence in `backend/src/pipeline/stages/feedback.js` and `backend/src/db/queries/feedback.js`
- [X] T021 [US4] Wire feedback stage into the pipeline in `backend/src/pipeline/stages/index.js` and `backend/src/pipeline/runner.js`
- [X] T022 [US4] Apply bounded adjustments in `backend/src/pipeline/grouping-policy.js` and `backend/src/pipeline/stages/extraction.js`

**Checkpoint**: User Story 4 is independently testable and auditable

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T023 [P] Update quickstart validation steps in `specs/003-incident-centric-stability/quickstart.md`
- [ ] T024 Run quickstart scenarios and record results in `specs/003-incident-centric-stability/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational - no dependencies
- **User Story 2 (P2)**: Starts after Foundational - no dependencies
- **User Story 3 (P3)**: Starts after Foundational - no dependencies
- **User Story 4 (P4)**: Starts after Foundational - no dependencies

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T002, T005 can run in parallel
- Test tasks per story (T006, T011, T012, T015, T019) can run in parallel
- UI tasks can run in parallel with backend tasks when files do not overlap

---

## Parallel Example: User Story 1

```bash
# Launch tests for User Story 1 together:
Task: "Add integration test for incident detail rollup history in backend/tests/integration/incidents_rollups.test.js"

# Launch UI work in parallel with backend grouping persistence:
Task: "Persist full grouping decisions in backend/src/pipeline/stages/grouping.js"
Task: "Update incident feed/detail UI in frontend/src/views/incidents.js"
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
2. Add User Story 1 → Test independently → Deploy/Demo (MVP)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
   - Developer D: User Story 4
3. Stories complete and integrate independently

---

## Notes

- Include explicit validation tasks when touching ingestion, schema/migrations,
  grouping logic, or notifications.
- Include migration and audit-trail tasks when schema changes are required.
- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
