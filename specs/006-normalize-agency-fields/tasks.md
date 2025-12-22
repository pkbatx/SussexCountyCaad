---

description: "Task list for Normalized Agency Fields"
---

# Tasks: Normalized Agency Fields

**Input**: Design documents from `/specs/006-normalize-agency-fields/`
**Prerequisites**: plan.md (required), spec.md, research.md, data-model.md, contracts/

**Tests/Validation**: Validation tasks are REQUIRED when changes touch ingestion, schema/migrations, grouping logic, or notifications.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and schema scaffolding

- [X] T001 Create agency registry migration in `backend/src/db/migrations/005_agency_registry.sql`
- [X] T002 Update migration registry in `backend/src/db/migrate.js` for 005
- [X] T003 [P] Add agency registry config flags in `backend/src/config/env.js`
- [X] T004 [P] Create agency registry query module in `backend/src/db/queries/agencies.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core normalization and data projection used by all stories

- [X] T005 Implement deterministic agency normalization rules in `backend/src/pipeline/agency-normalizer.js`
- [X] T006 Update filename hints to extract agency tokens in `backend/src/pipeline/filename-hints.js`
- [X] T007 Update extraction output to include normalized operator fields grounded by reference data in `backend/src/pipeline/stages/extraction.js`
- [X] T008 Update rollup key fields to use normalized fields in `backend/src/pipeline/stages/incident-summary.js`
- [X] T009 Update call and incident projections for normalized fields in `backend/src/db/queries/calls.js` and `backend/src/db/queries/incidents.js`
- [X] T010 Update metadata schema validation for normalized operator fields in `backend/src/ai/schema/metadata.json` and `backend/src/ai/validate.js`
- [X] T011 Update grouping policy to enforce incident-type as a secondary signal in `backend/src/pipeline/grouping-policy.js`
- [X] T012 [P] Add grouping policy validation test in `backend/tests/integration/grouping_policy_normalized_fields.test.js`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Operator-facing normalized fields (Priority: P1) 🎯 MVP

**Goal**: Operators see clean, normalized agency/type/location fields without model metadata.

**Independent Test**: Call and incident views show normalized fields and omit confidence/evidence.

### Tests for User Story 1

- [X] T013 [P] [US1] Add API response test in `backend/tests/integration/operator_fields.test.js`
- [X] T014 [P] [US1] Add unknown-field behavior test in `backend/tests/integration/unknown_fields.test.js`

### Implementation for User Story 1

- [X] T015 [US1] Remove metadata extracts from operator responses in `backend/src/api/handlers/calls.js` and `backend/src/api/handlers/incidents.js`
- [X] T016 [US1] Update client data mapping in `frontend/src/api.js`
- [X] T017 [US1] Render normalized fields in `frontend/src/views/calls.js` and `frontend/src/views/incidents.js`
- [X] T018 [US1] Update detail views in `frontend/src/views/call-detail.js` and `frontend/src/views/incident-detail.js`

**Checkpoint**: User Story 1 functional and testable

---

## Phase 4: User Story 2 - Agency normalization + filtering (Priority: P2)

**Goal**: Agency normalization is consistent and filterable using a canonical registry.

**Independent Test**: Variant filenames collapse to one agency label and filters work.

### Tests for User Story 2

- [X] T019 [P] [US2] Add agency normalization test in `backend/tests/integration/agency_normalization.test.js`
- [X] T020 [P] [US2] Add agency filter/registry test in `backend/tests/integration/agency_filtering.test.js`

### Implementation for User Story 2

- [X] T021 [US2] Wire registry upsert/cleanup in `backend/src/db/queries/agencies.js` and `backend/src/pipeline/agency-normalizer.js`
- [X] T022 [US2] Add agencies API handler in `backend/src/api/handlers/agencies.js` and route in `backend/src/api/server.js`
- [X] T023 [US2] Add agency filter parsing in `backend/src/api/handlers/filters.js`
- [X] T024 [US2] Update filters UI to load agencies in `frontend/src/views/filters.js`

**Checkpoint**: User Story 2 functional and testable

---

## Phase 5: User Story 3 - Simplified operational views (Priority: P3)

**Goal**: Operational views show simple status indicators and keep model metadata hidden.

**Independent Test**: Stage status appears as succeeded/failed/retry without model detail.

### Tests for User Story 3

- [X] T025 [P] [US3] Add debug endpoint gating test in `backend/tests/integration/debug_metadata_endpoint.test.js`

### Implementation for User Story 3

- [X] T026 [US3] Add debug metadata endpoint in `backend/src/api/handlers/debug.js` and route in `backend/src/api/server.js`
- [X] T027 [US3] Ensure simple stage status UI in `frontend/src/views/call-detail.js` and `frontend/src/views/incident-detail.js`

**Checkpoint**: User Story 3 functional and testable

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T028 [P] Update contract docs in `specs/006-normalize-agency-fields/contracts/openapi.yaml`
- [X] T029 [P] Verify quickstart steps in `specs/006-normalize-agency-fields/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Stories (Phase 3+)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on desired user stories completion

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational
- **User Story 2 (P2)**: Starts after Foundational (uses agency registry)
- **User Story 3 (P3)**: Starts after Foundational; may overlap UI edits from US1

### Within Each User Story

- Tests MUST be written and fail before implementation
- Backend changes before frontend wiring
- Story complete before moving to next priority

---

## Parallel Example: User Story 1

```bash
# Launch both API tests in parallel
Task: "Add API response test in backend/tests/integration/operator_fields.test.js"
Task: "Add unknown-field behavior test in backend/tests/integration/unknown_fields.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 + Phase 2
2. Complete User Story 1 and run its tests
3. Validate UI output manually (calls/incidents detail views)

### Incremental Delivery

1. Add User Story 2 for agency registry + filters
2. Add User Story 3 for simplified operational views
3. Final polish + doc sync
