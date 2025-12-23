# Tasks: Realtime Pipeline & UI Updates

## Phase 1: Setup

- [ ] T001 Confirm SSE event endpoint is enabled in backend/src/api/server.js
- [ ] T002 Add config defaults for lifecycle timing thresholds in backend/src/config/env.js

## Phase 2: Foundational

- [ ] T003 Add lifecycle fields to incident_groups (status, last_activity_at) in backend/src/db/migrations/010_realtime_lifecycle.sql
- [ ] T004 Update incident query indexes for lifecycle and filters in backend/src/db/queries/incidents.js
- [ ] T005 Update summary query helpers for transcript-grounded digest windows in backend/src/db/queries/summaries.js

## Phase 3: User Story 1 - Live Incident Overview (P1)

**Story Goal**: Calls and incidents appear immediately, then enrich over time with transcript-grounded summaries and lifecycle updates.

**Independent Test**: Ingest a call and verify incremental updates without manual refresh.

- [ ] T006 [US1] Emit incremental event payloads for call/incident updates in backend/src/services/events.js
- [ ] T007 [US1] Wire lifecycle state updates based on transcript activity in backend/src/services/insights.js
- [ ] T008 [US1] Update incident summary generation to use transcript text deltas in backend/src/services/digest.js
- [ ] T009 [US1] Stream incremental updates to the UI via SSE in frontend/src/api.js
- [ ] T010 [US1] Render live updates without layout thrash in frontend/src/views/incidents.js

## Phase 4: User Story 2 - Fast Drilldown Filtering (P2)

**Story Goal**: Multi-select filters drive backend-filtered feeds and aggregates with an active filters strip.

**Independent Test**: Apply agency/town/type/status filters and verify backend filtering.

- [ ] T011 [US2] Add filtered feed parameters to backend/src/api/handlers/incidents.js
- [ ] T012 [US2] Add filtered feed parameters to backend/src/api/handlers/calls.js
- [ ] T013 [US2] Provide active filter counts from backend/src/api/handlers/summary.js
- [ ] T014 [US2] Implement multi-select dropdown filters in frontend/src/views/filters.js
- [ ] T015 [US2] Add active filters strip UI in frontend/src/views/layout.js

## Phase 5: User Story 3 - Time Window Control (P3)

**Story Goal**: Polished time presets with optional expanded range selector.

**Independent Test**: Toggle 15m/1h/6h/24h presets and verify feed boundaries.

- [ ] T016 [US3] Support time presets in backend/src/api/handlers/filters.js
- [ ] T017 [US3] Add time presets + expandable range UI in frontend/src/views/filters.js
- [ ] T018 [US3] Ensure summaries respect time windows in backend/src/services/digest.js

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T019 Add integration tests for lifecycle transitions in backend/tests/integration/lifecycle.test.js
- [ ] T020 Add integration tests for realtime updates in backend/tests/integration/events_realtime.test.js
- [ ] T021 Verify UI updates under active filters in frontend/src/views/incidents.js

## Dependencies

- User Story 1 must complete before User Story 2 (live updates required for filter refresh).
- User Story 2 must complete before User Story 3 (filters feed time windows).

## Parallel Execution Examples

- T006 and T007 can run in parallel.
- T011 and T012 can run in parallel.
- T016 and T017 can run in parallel.

## Implementation Strategy

- MVP: Complete User Story 1 first (realtime incremental updates + transcript-grounded summaries).
- Next: Implement User Story 2 for fast drilldown filtering.
- Final: Add time window control and polish tests.
