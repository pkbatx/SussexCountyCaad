---

description: "Task list template for feature implementation"
---

# Tasks: Extraction & Grouping Accuracy v2

**Input**: Design documents from `/Users/pbuch/SussexCountyCaad/specs/002-improve-extraction-grouping/`
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

**Purpose**: Project initialization and test fixture scaffolding

- [x] T001 Create labeled transcript fixture folders in `backend/tests/fixtures/extraction-v2/` and `backend/tests/fixtures/grouping-v2/`
- [x] T002 Add fixture README guidance in `backend/tests/fixtures/extraction-v2/README.md` and `backend/tests/fixtures/grouping-v2/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema, migration, and validation components required by all stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Add rollup artifact table migration in `backend/src/db/migrations/002_rollup_artifacts.sql`
- [x] T004 [P] Implement rollup persistence helpers in `backend/src/db/queries/rollups.js`
- [x] T005 [P] Add candidate selection query helper in `backend/src/db/queries/incidents.js`
- [x] T006 [P] Add grouping window/threshold defaults in `backend/src/config/env.js` and `.env.example`
- [x] T007 [P] Update extraction v2 schema in `backend/src/ai/schema/metadata.json`
- [x] T008 [P] Update grouping v2 schema in `backend/src/ai/schema/grouping.json`
- [x] T009 [P] Add evidence validation helper in `backend/src/ai/validate.js`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Extract Metadata with Evidence (Priority: P1) 🎯 MVP

**Goal**: Produce extraction.v2 payloads with evidence-backed confidence and
unknown-safe fields.

**Independent Test**: Run extraction against labeled transcripts and verify
schema validity, evidence mapping, and null/empty fields for unknowns.

### Tests for User Story 1 (REQUIRED)

- [x] T010 [P] [US1] Add labeled extraction fixtures in `backend/tests/fixtures/extraction-v2/` (transcript + expected JSON)
- [x] T011 [P] [US1] Add extraction validation test in `backend/tests/integration/extraction-v2.test.js`

### Implementation for User Story 1

- [x] T012 [US1] Update extraction prompt composition for v2 schema in `backend/src/pipeline/stages/extraction.js`
- [x] T013 [US1] Enforce evidence + field confidence validation in `backend/src/pipeline/stages/extraction.js`
- [x] T014 [US1] Store extraction.v2 schema version and confidence_overall in `backend/src/db/queries/metadata.js`
- [x] T015 [US1] Update extraction system prompt for v2 in `backend/src/ai/openai.js`

**Checkpoint**: User Story 1 is fully functional and testable independently

---

## Phase 4: User Story 2 - Conservative Incident Grouping (Priority: P2)

**Goal**: Group calls conservatively using evidence-backed signals and a
candidate-limited context window.

**Independent Test**: Run grouping on fixtures with explicit incident IDs,
shared addresses, and conflicting signals; verify requires_review handling.

### Tests for User Story 2 (REQUIRED)

- [x] T016 [P] [US2] Add grouping fixtures in `backend/tests/fixtures/grouping-v2/` (candidates + expected JSON)
- [x] T017 [P] [US2] Add grouping validation test in `backend/tests/integration/grouping-v2.test.js`

### Implementation for User Story 2

- [x] T018 [US2] Build candidate selection window + filters in `backend/src/pipeline/stages/grouping.js`
- [x] T019 [US2] Update grouping prompt composition to include candidate summary in `backend/src/pipeline/stages/grouping.js`
- [x] T020 [US2] Update conservative merge policy for v2 signals in `backend/src/pipeline/grouping-policy.js`
- [x] T021 [US2] Persist grouping.v2 payloads via `backend/src/pipeline/stages/grouping.js`

**Checkpoint**: User Stories 1 and 2 are independently functional

---

## Phase 5: User Story 3 - Stable Incremental Rollups (Priority: P3)

**Goal**: Append incident rollups without overwriting history and include
included call IDs per version.

**Independent Test**: Add multiple calls to the same incident and confirm new
rollup artifacts append with version history intact.

### Tests for User Story 3 (REQUIRED)

- [x] T022 [P] [US3] Add rollup stability test in `backend/tests/integration/rollup-v2.test.js`

### Implementation for User Story 3

- [x] T023 [US3] Append rollup artifacts with included call IDs in `backend/src/pipeline/stages/incident-summary.js`
- [x] T024 [US3] Expose rollup artifacts in incident detail response at `backend/src/api/handlers/incidents.js`

**Checkpoint**: All user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: UI visibility, documentation updates, and final validation

- [x] T025 [P] Surface evidence and requires_review fields in `frontend/src/views/call-detail.js` and `frontend/src/views/incident-detail.js`
- [x] T026 [P] Add evidence/review styling in `frontend/src/styles.css`
- [x] T027 [P] Update v2 validation steps in `specs/002-improve-extraction-grouping/quickstart.md`
- [x] T028 Validate quickstart steps in `specs/002-improve-extraction-grouping/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependency on other stories
- **User Story 2 (P2)**: Can start after Foundational - depends on US1 output for extraction summary
- **User Story 3 (P3)**: Can start after Foundational - depends on grouping decisions

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Fixtures before validation tests
- Validation tests before stage changes
- Stage changes before UI or documentation updates

### Parallel Opportunities

- Phase 2 tasks marked [P] can run in parallel
- Fixture creation and test setup tasks can run in parallel with schema updates
- UI updates can run in parallel with quickstart updates in Phase 6

---

## Parallel Example: User Story 1

- **Parallel set A**: T010 (fixtures), T011 (test harness) once directories exist
- **Sequential**: T012 → T013 → T014 → T015

## Parallel Example: User Story 2

- **Parallel set A**: T016 (fixtures), T017 (test harness)
- **Sequential**: T018 → T019 → T020 → T021

## Parallel Example: User Story 3

- **Parallel set A**: T022 (rollup test)
- **Sequential**: T023 → T024

---

## Implementation Strategy

- Deliver US1 first as the MVP to stabilize extraction quality and evidence.
- Add US2 grouping conservatism next to prevent incorrect merges.
- Finish with US3 rollup stability for long-term operator trust.
- Complete Phase 6 polish after core behavior is verified.
