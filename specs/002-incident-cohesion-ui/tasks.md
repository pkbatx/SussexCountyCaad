---

description: "Task list for feature implementation"
---

# Tasks: Incident-Centric Cohesion UI

**Input**: Design documents from `/Users/pbuch/SussexCountyCaad/specs/002-incident-cohesion-ui/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: No automated tests requested; rely on manual validation per quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared helpers used across UI and API updates.

- [X] T001 [P] Create time + confidence formatting helpers in `frontend/src/state/formatting.js`
- [X] T002 [P] Add confidence tier mapping helper in `backend/src/services/confidence.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: API response shaping and filters used across all stories.

- [X] T003 [P] Update summary/digest response parsing in `frontend/src/api.js`
- [X] T004 [P] Add pending-call filter support in `backend/src/api/handlers/filters.js` and `backend/src/db/queries/calls.js`
- [X] T005 [P] Expose call progression status fields in `backend/src/api/handlers/calls.js`
- [X] T006 Update incident list/detail payload fields (pending, last activity, confidence signals) in `backend/src/db/queries/incidents.js` and `backend/src/api/handlers/incidents.js`

---

## Phase 3: User Story 1 - Incident-First Operations View (Priority: P1) 🎯 MVP

**Goal**: Incident-first landing, 24-hour seconds clock, and clear incident-centric metrics.

**Independent Test**: Open the UI and verify incident-first layout, header clock, and summary clarity.

- [X] T007 [US1] Make incidents the primary view and remove call/incident toggle in `frontend/src/App.jsx`
- [X] T008 [US1] Render a 24-hour HH:MM:SS clock that ticks every second in `frontend/src/components/layout/AppLayout.jsx`
- [X] T009 [US1] Refocus incident list visuals and labels in `frontend/src/components/incidents/IncidentsBoard.jsx`
- [X] T010 [US1] Replace call-centric metrics with labeled incident metrics in `frontend/src/components/summary/SummaryPanel.jsx` and `frontend/src/styles.css`
- [X] T011 [US1] Align summary metrics fields with incident-first labels in `backend/src/db/queries/summaries.js` and `backend/src/api/handlers/summary.js`

---

## Phase 4: User Story 2 - Call-to-Incident Progression (Priority: P2)

**Goal**: Pending incidents and call drill-down reflect transcription progress and grouping transitions.

**Independent Test**: Ingest a new call and verify pending incident state, then drill into a grouped call.

- [X] T012 [US2] Add pending incident section sourced from ungrouped calls in `frontend/src/components/incidents/IncidentsBoard.jsx`
- [X] T013 [US2] Show call progression state + confidence tier in incident drill-down list in `frontend/src/components/details/IncidentDetail.jsx`
- [X] T014 [US2] Preserve filter context when routing to call detail in `frontend/src/App.jsx`
- [X] T015 [US2] Surface transcription/progress status and incident link in `frontend/src/components/details/CallDetail.jsx`

---

## Phase 5: User Story 3 - Digest, History, and Confidence Clarity (Priority: P3)

**Goal**: Incident-level digest summaries, readable rollup history, and refreshed audio UI.

**Independent Test**: Verify one digest per incident, readable history, and polished audio playback.

- [X] T016 [US3] Aggregate digest summaries per incident per window in `backend/src/services/digest.js` and `backend/src/db/queries/digests.js`
- [X] T017 [US3] Normalize digest response shape in `backend/src/api/handlers/summary.js`
- [X] T018 [US3] Render incident-level digest entries in `frontend/src/components/summary/SummaryPanel.jsx`
- [X] T019 [US3] Replace rollup history and link reasons with human-readable updates in `backend/src/api/handlers/incidents.js` and `frontend/src/components/details/IncidentDetail.jsx`
- [X] T020 [US3] Redesign audio player layout and controls in `frontend/src/components/audio/AudioPlayer.jsx` and `frontend/src/styles.css`
- [X] T021 [US3] Display confidence tiers and review labels in `frontend/src/components/details/CallDetail.jsx` and `frontend/src/styles.css`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and validation for incident-first cohesion.

- [X] T022 [P] Remove unused call view toggle component in `frontend/src/components/controls/ViewToggle.jsx` and related imports
- [ ] T023 Run manual validation checklist in `specs/002-incident-cohesion-ui/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Stories (Phase 3+)**: Depend on Foundational phase completion
- **Polish (Phase 6)**: Depends on completion of desired user stories

### User Story Dependencies

- **US1 (P1)**: Must complete before final integration of US2/US3
- **US2 (P2)**: Builds on incident-first layout and call progress fields
- **US3 (P3)**: Builds on incident-first metrics and incident detail payloads

### Parallel Opportunities

- T001, T002, T003, T004, T005 can run in parallel (separate files)
- US1 tasks T008–T010 can run in parallel with backend task T011
- US3 tasks T016–T018 can run in parallel with T020

---

## Parallel Example: User Story 1

```bash
Task: "Render a 24-hour HH:MM:SS clock that ticks every second in frontend/src/components/layout/AppLayout.jsx"
Task: "Replace call-centric metrics with labeled incident metrics in frontend/src/components/summary/SummaryPanel.jsx"
Task: "Align summary metrics fields with incident-first labels in backend/src/db/queries/summaries.js"
```

## Parallel Example: User Story 2

```bash
Task: "Add pending incident section sourced from ungrouped calls in frontend/src/components/incidents/IncidentsBoard.jsx"
Task: "Surface transcription/progress status and incident link in frontend/src/components/details/CallDetail.jsx"
```

## Parallel Example: User Story 3

```bash
Task: "Aggregate digest summaries per incident per window in backend/src/services/digest.js"
Task: "Redesign audio player layout and controls in frontend/src/components/audio/AudioPlayer.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate with quickstart checklist items 1-3

### Incremental Delivery

1. Add User Story 2 tasks and validate checklist items 4-5
2. Add User Story 3 tasks and validate checklist items 6-9
3. Complete Polish tasks and re-verify the full checklist
