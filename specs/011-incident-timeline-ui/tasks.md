# Tasks: Incident Timeline Console

**Branch**: `011-incident-timeline-ui`  
**Spec**: /Users/pbuch/SussexCountyCaad/specs/011-incident-timeline-ui/spec.md  
**Plan**: /Users/pbuch/SussexCountyCaad/specs/011-incident-timeline-ui/plan.md

## Phase 1: Setup

- [X] T001 Confirm WaveSurfer dependency and document usage in frontend/package.json
- [X] T002 [P] Inventory existing incident detail UI sections to replace in frontend/src/components/details/IncidentDetail.jsx
- [X] T003 [P] Inventory backend incident detail endpoints to extend in backend/src/api/handlers/incidents.js

## Phase 2: Foundational

- [X] T004 Define timeline event aggregation query scaffolding in backend/src/db/queries/timeline.js
- [X] T005 Implement timeline aggregation service in backend/src/services/timeline.js
- [X] T006 Add timeline endpoint handler in backend/src/api/handlers/incidents.js for /api/incidents/{incidentId}/timeline
- [X] T007 Add summary evidence endpoint handler in backend/src/api/handlers/summary.js for /api/summary/{statementId}/evidence
- [X] T008 Add transcript segment endpoint handler in backend/src/api/handlers/timeline.js for /api/timeline/{eventId}/transcript
- [X] T009 Wire new timeline routes in backend/src/api/routes.js

## Phase 3: User Story 1 - Unified Incident Timeline (P1)

**Goal**: Replace the incident detail view with a single time-ordered timeline containing all events, with nested calls under dispatch events.

**Independent Test**: Load an incident with multiple calls and confirm a single ordered timeline renders with nested call items.

- [X] T010 [US1] Build timeline data adapter in frontend/src/state/timeline.js to normalize API events and nesting
- [X] T011 [US1] Create TimelineView component in frontend/src/components/timeline/TimelineView.jsx
- [X] T012 [US1] Create TimelineItem component with inline expansion in frontend/src/components/timeline/TimelineItem.jsx
- [X] T013 [US1] Update IncidentDetail layout to use TimelineView and remove standalone call list/rollup history in frontend/src/components/details/IncidentDetail.jsx
- [X] T014 [US1] Add timeline styling and hierarchy (nesting, indentation, timestamps) in frontend/src/styles.css

## Phase 4: User Story 2 - Synchronized Playback Cursor (P2)

**Goal**: Synchronize audio playback, transcript focus, and timeline position via a global playback cursor.

**Independent Test**: Seek audio and verify timeline focus and transcript highlight update within 2 seconds.

- [X] T015 [US2] Implement global playback cursor state in frontend/src/state/playback.js
- [X] T016 [US2] Integrate WaveSurfer waveform player into TimelineItem expansion in frontend/src/components/timeline/TimelineItem.jsx
- [X] T017 [US2] Add transcript list with seek callbacks in frontend/src/components/timeline/TranscriptPanel.jsx
- [X] T018 [US2] Wire playback cursor updates to timeline focus in frontend/src/components/timeline/TimelineView.jsx
- [X] T019 [US2] Add UI affordances for active playback event in frontend/src/styles.css

## Phase 5: User Story 3 - Evidence-Linked Incident Summary (P3)

**Goal**: Provide a persistent summary panel linked to evidence in the timeline.

**Independent Test**: Selecting a summary statement highlights supporting transcript lines and audio segments.

- [X] T020 [US3] Build summary panel component in frontend/src/components/summary/IncidentSummaryPanel.jsx
- [X] T021 [US3] Implement evidence highlight logic in frontend/src/components/timeline/TimelineItem.jsx
- [X] T022 [US3] Add evidence link fetcher in frontend/src/api.js
- [X] T023 [US3] Update IncidentDetail layout to include summary panel alongside timeline in frontend/src/components/details/IncidentDetail.jsx
- [X] T024 [US3] Add summary panel styling in frontend/src/styles.css

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T025 Replace AI-branded labels with neutral wording in frontend/src/components/timeline/TimelineItem.jsx
- [X] T026 [P] Ensure incremental update behavior for timeline polling in frontend/src/hooks/useTimelinePolling.js
- [X] T027 [P] Update docs and quickstart references in specs/011-incident-timeline-ui/quickstart.md

## Dependencies

- US1 must complete before US2 and US3 (timeline foundation required for playback and summary linking).
- US2 and US3 can proceed in parallel after US1.

## Parallel Execution Examples

- US1: T010 and T011 can run in parallel (state adapter vs. component scaffold).
- US2: T016 and T017 can run in parallel (waveform vs. transcript list).
- US3: T020 and T022 can run in parallel (summary UI vs. API fetcher).

## Implementation Strategy

Start with timeline aggregation and UI scaffolding (US1) to establish the single authoritative timeline. Add playback synchronization (US2) next to enable global cursor behavior. Finish with evidence-linked summary panel (US3) to provide traceable summaries. Polish with neutral styling and incremental update behavior.
