---

description: "Task list for feature implementation"
---

# Tasks: Headless UI Frontend Migration

**Input**: Design documents from `/Users/pbuch/SussexCountyCaad/specs/001-react-headless-ui/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests/Validation**: No automated tests requested; rely on manual parity validation per spec and quickstart.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and React tooling setup.

- [x] T001 Update React + Headless UI dependencies in `frontend/package.json`
- [x] T002 Update Vite React plugin configuration in `frontend/vite.config.js`
- [x] T003 Switch entry script to React in `frontend/index.html`
- [x] T004 Create React entrypoint with CSS imports in `frontend/src/main.jsx`
- [x] T005 Create root application shell component in `frontend/src/App.jsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared hooks, config, and layout needed by all stories.

- [x] T006 Move UI constants into React-friendly module in `frontend/src/config.js`
- [x] T007 Create filter state helpers (defaults + serialization) in `frontend/src/state/filters.js`
- [x] T008 Implement hash-based routing hook in `frontend/src/hooks/useHashRoute.js`
- [x] T009 Implement SSE + polling status hook in `frontend/src/hooks/useSseStatus.js`
- [x] T010 Implement detail cache hook for calls/incidents in `frontend/src/hooks/useDetailCache.js`
- [x] T011 Implement map view persistence hook in `frontend/src/hooks/useMapViewState.js`
- [x] T012 Build shared layout shell (header, panels, footer slots) in `frontend/src/components/layout/AppLayout.jsx`

---

## Phase 3: User Story 1 - Monitor calls and incidents (Priority: P1) 🎯 MVP

**Goal**: Filters, summaries, calls/incidents lists, detail views, audio, and feedback parity.

**Independent Test**: Load the console, apply filters, open call and incident details, play audio, and submit feedback; outputs match baseline.

- [x] T013 [P] [US1] Build filter panel with Headless UI controls in `frontend/src/components/filters/FilterPanel.jsx`
- [x] T014 [P] [US1] Build summary strip + insights + digest in `frontend/src/components/summary/SummaryPanel.jsx`
- [x] T015 [P] [US1] Build calls list with paging + play action in `frontend/src/components/calls/CallsList.jsx`
- [x] T016 [P] [US1] Build incidents board with buckets/tags in `frontend/src/components/incidents/IncidentsBoard.jsx`
- [x] T017 [P] [US1] Build audio player footer with playback controls in `frontend/src/components/audio/AudioPlayer.jsx`
- [x] T018 [P] [US1] Build call detail view (stages, transcript, feedback) in `frontend/src/components/details/CallDetail.jsx`
- [x] T019 [P] [US1] Build incident detail view (rollups, members, feedback) in `frontend/src/components/details/IncidentDetail.jsx`
- [x] T020 [US1] Build list-mode toggle using Headless UI in `frontend/src/components/controls/ViewToggle.jsx`
- [x] T021 [US1] Wire operations route (filters + summary + list + audio) in `frontend/src/App.jsx`
- [x] T022 [US1] Wire call detail route (detail + map + summary) in `frontend/src/App.jsx`
- [x] T023 [US1] Wire incident detail route (detail + map + summary) in `frontend/src/App.jsx`
- [x] T024 [US1] Ensure filter changes refresh summary and lists in `frontend/src/App.jsx`

---

## Phase 4: User Story 2 - Analyze activity on the map (Priority: P2)

**Goal**: Map markers/heatmap toggles, selection routing, and view persistence.

**Independent Test**: Toggle map modes, select markers, and confirm view state persists after navigation.

- [x] T025 [P] [US2] Build map panel component using map adapter in `frontend/src/components/map/MapView.jsx`
- [x] T026 [US2] Add Headless UI map mode toggle in `frontend/src/components/map/MapModeToggle.jsx`
- [x] T027 [US2] Wire map into routes with view-state persistence in `frontend/src/App.jsx`
- [x] T028 [US2] Connect map point selection to routing in `frontend/src/App.jsx`

---

## Phase 5: User Story 3 - Stay aware of system status (Priority: P3)

**Goal**: Notifications view and system status indicators with clear error visibility.

**Independent Test**: Open notifications, verify empty/error states, and confirm SSE status badge updates.

- [x] T029 [P] [US3] Build notifications list view in `frontend/src/components/notifications/NotificationsView.jsx`
- [x] T030 [US3] Wire notifications route in `frontend/src/App.jsx`
- [x] T031 [US3] Add SSE status badge to header in `frontend/src/components/layout/AppLayout.jsx`
- [x] T032 [US3] Standardize empty/error states in `frontend/src/components/common/EmptyState.jsx`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, parity checks, and documentation updates.

- [x] T033 Remove legacy vanilla view modules after migration in `frontend/src/views/`
- [x] T034 Align focus/keyboard styles for Headless UI components in `frontend/src/styles.css`
- [x] T035 Update parity checklist notes in `specs/001-react-headless-ui/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1
- **User Stories (Phase 3+)**: Depend on Phase 2
- **Polish (Phase 6)**: Depends on completion of desired user stories

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational phase; no dependency on US2/US3
- **US2 (P2)**: Can start after Foundational phase; integrates with routing but independently testable
- **US3 (P3)**: Can start after Foundational phase; independently testable

### Parallel Opportunities

- Phase 1 tasks T001–T004 can be parallelized
- Phase 2 tasks T006–T011 can be parallelized
- US1 tasks T013–T019 can be parallelized
- US2 tasks T025 can be done in parallel with US1 tasks
- US3 task T029 can run in parallel with US1/US2 work

---

## Parallel Example: User Story 1

```bash
Task: "Build filter panel with Headless UI controls in frontend/src/components/filters/FilterPanel.jsx"
Task: "Build summary strip + insights + digest in frontend/src/components/summary/SummaryPanel.jsx"
Task: "Build calls list with paging + play action in frontend/src/components/calls/CallsList.jsx"
Task: "Build incidents board with buckets/tags in frontend/src/components/incidents/IncidentsBoard.jsx"
```

## Parallel Example: User Story 2

```bash
Task: "Build map panel component using map adapter in frontend/src/components/map/MapView.jsx"
Task: "Add Headless UI map mode toggle in frontend/src/components/map/MapModeToggle.jsx"
```

## Parallel Example: User Story 3

```bash
Task: "Build notifications list view in frontend/src/components/notifications/NotificationsView.jsx"
Task: "Standardize empty/error states in frontend/src/components/common/EmptyState.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup + Foundational
2. Implement User Story 1 tasks (T013–T024)
3. Validate parity against baseline UI using quickstart steps

### Incremental Delivery

1. Add User Story 2 tasks (T025–T028) after US1
2. Add User Story 3 tasks (T029–T032) after US1
3. Finish Polish tasks (T033–T035)
