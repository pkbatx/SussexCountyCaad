# Feature Specification: Realtime Pipeline & UI Updates

**Feature Branch**: `010-realtime-pipeline-ui`  
**Created**: 2025-12-22  
**Status**: Draft  
**Input**: User description: "I want to tighten up both the pipeline and the UI so this feels genuinely realtime, efficient, and scalable, without painting myself into a corner where I have to rewrite everything later. The biggest issue right now is the incident summaries—especially the rollups like “last 24 hours.” Those summaries need to come directly from the actual call transcripts. They’re too vanilla today and don’t reflect what was actually said on the radio. I want them to be grounded in the dispatcher and caller language, with real details pulled from the transcript, not generic labels or templated phrasing. As transcripts come in, the summaries should appear quickly and then improve as more of the call is available. From a pipeline perspective, I want to move toward progressive enrichment. New calls should show up immediately, even if they’re incomplete, and then get filled in over time as transcription, extraction, grouping, and summarization run. Each stage should only do the minimum work it needs to do, and only when something actually changes. No reprocessing entire records, no unnecessary AI reruns, no heavy database reads just to refresh the UI. The system should feel realtime end to end. The backend should push updates to the frontend as things happen—new calls, transcript updates, summary changes, lifecycle state changes—so the UI can update live without polling or full reloads. The payloads should be small and incremental, just enough to update the current state. I also want to clean up how time works in the UI. Right now everything is effectively “last 24 hours,” which feels blunt. I want a polished but minimal time filter: quick presets like last 15 minutes, 1 hour, 6 hours, and 24 hours, with a more detailed date/time range selector that’s collapsed by default and only expands when needed. It should stay out of the way and never dominate the page. For incident lifecycle timing, I want something more realistic and operational. Think roughly a 20-minute total lifecycle. An incident starts as Active while the call and transcript are coming in, moves to Monitoring once things quiet down, and then transitions to Responded when the lifecycle naturally expires or a response is clearly established. Those transitions should be automatic, based on transcript activity and timing, and should update the UI in realtime. On the UI side, I want to keep it simple and overview-first—still a single-page, CAD-style layout—but more usable. Add clean dropdown filters for things like agency, town, incident type, and status. Multi-select where it makes sense, sensible defaults, and a clear indication of what filters are active. I should be able to pivot quickly from “everything” to “one agency in one town” and then drill into a specific incident without losing context. To support that, I want you to reassess the backend data approach. It’s local-first and SQLite-based today, and I’m fine with that, but the API layer needs to be able to serve fast filtered feeds, aggregates, and live updates without pushing heavy logic onto the frontend. If something needs to change to support realtime streaming and efficient filtering, propose a controlled, minimal change that preserves the existing data model and avoids unnecessary complexity. Keep the UI changes scoped to summaries, time filtering, dropdown filters, drilldowns, and realtime updates. No heavy frontend frameworks, no broad redesign. The goal is to make what’s already here feel fast, alive, and operationally solid. I want the overview to support stacked, array-style filtering and pivoting across key dimensions—agency, town, incident type, and status—where each dimension can act as both a filter and a drilldown path. These should be multi-select where it makes sense, with sensible defaults, and they should compose cleanly so I can narrow the view step by step. The flow should feel like: • Start with all incidents • Click or select one or more agencies • Further narrow by one or more towns • Then pivot by incident type or status • Finally drill into a specific incident, without losing the filter context These drilldowns shouldn’t feel modal or heavyweight. They should behave like live arrays that refine the active dataset in place, with a clear “active filters” strip that shows the current pivots and lets me remove or adjust them quickly. Critically, these array drilldowns need to be backed by the backend—not client-side joins. The API should serve already-filtered feeds, counts, and rollups so the frontend is just rendering state, not calculating it. As realtime updates come in, they should be evaluated against the active drilldown arrays so new or updated incidents appear or disappear automatically based on the current filters. This is about fast operational pivots, not analytics. I should be able to move from a county-wide view to a very specific slice and back out again in seconds, with the UI staying responsive and the data staying live. Finally, the AI pipeline needs to work with this realtime model, not against it. Extraction and grouping should stay conservative and grounded, but they should run in a way that allows partial results to show up immediately and improve over time. Feedback and reprocessing should visibly update the UI as changes happen, not require manual refreshes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Incident Overview (Priority: P1)

As an operator, I see new calls and incidents appear immediately, even when incomplete, and watch them enrich over time with transcript-based summaries and lifecycle state changes.

**Why this priority**: This is the core operational workflow and the reason the system exists.

**Independent Test**: Can be tested by ingesting a call and observing incremental updates without page reloads.

**Acceptance Scenarios**:

1. **Given** a new call is ingested, **When** the UI is open, **Then** a new incident or call appears immediately with partial data and updates as stages complete.
2. **Given** transcript segments arrive over time, **When** summaries are updated, **Then** the incident summary reflects transcript language and visibly improves without losing history.

---

### User Story 2 - Fast Drilldown Filtering (Priority: P2)

As an operator, I pivot quickly by agency, town, incident type, and status using multi-select filters and an active filters strip, without losing context.

**Why this priority**: Fast narrowing from county-wide to a specific slice is required for operational use.

**Independent Test**: Can be tested by applying filters and confirming feeds and counts match the selected arrays.

**Acceptance Scenarios**:

1. **Given** multiple agencies and towns are active, **When** I select one or more agencies and towns, **Then** the incident feed and aggregates update to only matching items.

---

### User Story 3 - Time Window Control (Priority: P3)

As an operator, I switch between concise time presets and an expanded custom range selector without the time filter dominating the UI.

**Why this priority**: Operational context depends on quick time slicing while keeping the interface minimal.

**Independent Test**: Can be tested by applying presets and a custom range to verify feed boundaries.

**Acceptance Scenarios**:

1. **Given** a set of calls across multiple hours, **When** I select the 15-minute preset, **Then** only items within that window appear in feeds and aggregates.

---

### Edge Cases

- What happens when a call has no transcript yet?
- How does the system handle live updates that no longer match the active filters?
- What happens when no data exists for the selected time window?

## Constitution Alignment *(mandatory)*

- **Local-first durability + idempotency**: No change to local-first persistence; new updates remain fully local and idempotent.
- **Deterministic call identity + read-only calls input**: No changes; call identity stays content-hash based and calls input remains read-only.
- **AI output schema + validation**: Summaries must be transcript-grounded and validated; partial outputs are allowed but still schema-compliant.
- **Conservative grouping + incremental summaries**: Grouping remains conservative; summaries are incremental and improve as transcripts arrive.
- **Failure visibility + retry paths**: Stage failures and retries remain visible; live updates must reflect failure state changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST publish incremental updates for calls, incidents, summaries, and lifecycle state changes without requiring manual refresh.
- **FR-002**: System MUST show newly ingested calls immediately, even when transcription or extraction is incomplete.
- **FR-003**: System MUST generate incident summaries grounded in transcript language and update them as more transcript text becomes available.
- **FR-004**: System MUST avoid reprocessing unchanged records; stages run only when dependent inputs change.
- **FR-005**: System MUST support multi-select filtering for agency, town, incident type, and status, with an active filters strip.
- **FR-006**: System MUST provide time presets (15 minutes, 1 hour, 6 hours, 24 hours) plus an expandable custom range selector.
- **FR-007**: System MUST transition incident lifecycle states automatically across Active → Monitoring → Responded using timing and transcript activity.
- **FR-008**: Backend MUST serve filtered feeds, counts, and rollups to the UI without requiring client-side joins.
- **FR-009**: Live updates MUST be evaluated against current filter arrays so items appear or disappear in place.
- **FR-010**: UI MUST remain overview-first and minimize layout churn while updates stream in.

### Key Entities *(include if feature involves data)*

- **Incident Lifecycle**: Represents state transitions (Active, Monitoring, Responded) with timing metadata.
- **Incident Summary**: Versioned, transcript-grounded summary text tied to a time window.
- **Filter Context**: Active arrays for agency, town, incident type, status, and time window.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New calls appear in the UI within 5 seconds of ingestion.
- **SC-002**: Filter changes update feeds and aggregates within 2 seconds.
- **SC-003**: Summaries update within 2 minutes of new transcript text availability.
- **SC-004**: Incidents transition through lifecycle states within the defined 20-minute window without manual action.

## Assumptions

- UI remains a single-page CAD-style layout with incremental enhancements only.
- Summary generation continues to use transcript text as the primary source of detail.
