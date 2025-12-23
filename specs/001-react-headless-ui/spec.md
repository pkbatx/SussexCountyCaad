# Feature Specification: Headless UI Frontend Migration

**Feature Branch**: `001-react-headless-ui`  
**Created**: 2025-12-22  
**Status**: Draft  
**Input**: User description: "Convert the current operations console UI to a component-based frontend with headless UI patterns while preserving full functionality and visual parity."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Monitor calls and incidents (Priority: P1)

As an operations user, I can apply filters, review summaries, browse calls and incidents, and drill into details so that I can assess current activity without losing any existing capabilities.

**Why this priority**: This is the primary operational workflow and must remain fully functional after the UI migration.

**Independent Test**: Can be fully tested by loading the console, applying filters, opening call and incident details, and confirming data, audio, and feedback actions match the current baseline.

**Acceptance Scenarios**:

1. **Given** the default filter window and available data, **When** the console loads, **Then** summary metrics, the incident board, and the call list render with counts and labels matching the baseline UI.
2. **Given** a call with audio and transcript data, **When** the user opens call detail and presses play, **Then** audio plays, transcript and summary are visible, and feedback actions are available.
3. **Given** an incident with rollups and member calls, **When** the user opens incident detail, **Then** rollup history, member calls, and feedback history render and update after feedback is submitted.

---

### User Story 2 - Analyze activity on the map (Priority: P2)

As an operations user, I can review geographic activity using markers or heatmaps and select items to open related details.

**Why this priority**: Geographic context is a key secondary workflow for situational awareness.

**Independent Test**: Can be fully tested by toggling map modes, selecting map points, and confirming the correct detail view opens.

**Acceptance Scenarios**:

1. **Given** map data for the current filters, **When** the user switches between markers and heatmap, **Then** the map updates to the selected mode and the toggle state reflects the choice.
2. **Given** a visible map marker, **When** the user selects it, **Then** the corresponding call or incident detail opens.
3. **Given** the user pans or zooms the map, **When** they return to the map, **Then** the view state remains consistent with their last position.

---

### User Story 3 - Stay aware of system status (Priority: P3)

As an operations user, I can see system status indicators and notifications, and I receive clear feedback when data is unavailable.

**Why this priority**: Clear system status and error visibility reduce confusion and support triage.

**Independent Test**: Can be fully tested by loading the notifications view and simulating empty or error states.

**Acceptance Scenarios**:

1. **Given** notifications exist, **When** the user opens notifications, **Then** each notification is listed with its subject and status.
2. **Given** no notifications exist, **When** the user opens notifications, **Then** an empty-state message is displayed.
3. **Given** a data load error, **When** the error occurs, **Then** the UI shows an actionable error message without breaking the rest of the console.

---

### Edge Cases

- What happens when filters return no calls or incidents?
- How does the UI handle missing audio, transcripts, or rollup summaries?
- What happens when map data is truncated or unavailable?
- How does the system respond if the map configuration is missing?
- What happens when time filters are invalid or reversed?
- How does the UI handle partial data loads (e.g., summary loads but lists fail)?

## Constitution Alignment *(mandatory)*

- **Local-first durability + idempotency**: UI migration does not change data ingestion or storage behavior; existing write actions (feedback, retries) remain idempotent.
- **Deterministic call identity + read-only calls input**: All views continue to use the existing call and incident identifiers; no new mutation of call inputs is introduced.
- **AI output schema + validation**: Summaries and insights are displayed as-is with graceful handling of missing or invalid data; no new generation paths are added.
- **Conservative grouping + incremental summaries**: Incident grouping and rollup history display remain unchanged and reflect existing rules.
- **Failure visibility + retry paths**: Errors remain visible in-context and existing retry actions (such as stage retry or reload) are preserved.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide all existing console views and navigation (summary, calls, incidents, map, notifications, and detail views).
- **FR-002**: The system MUST apply filters (time window, incident type, jurisdiction, agencies, service types, status) consistently across summary, lists, and map.
- **FR-003**: The calls list MUST show call status, location, agency, and service type, support paging, and allow opening call detail and playing audio.
- **FR-004**: The incidents board MUST display active, monitoring, and resolved groupings with tags and metadata, support paging, and allow opening incident detail.
- **FR-005**: Call detail MUST show audio controls, transcript, summary, stage status with retry action, and feedback controls with visible history.
- **FR-006**: Incident detail MUST show rollup history, member calls, summary, and feedback controls with visible history.
- **FR-007**: The map view MUST support marker and heatmap modes, reflect current filters, and allow selecting a map point to open the related detail.
- **FR-008**: The map view MUST preserve user view state (center and zoom) across navigation within a session.
- **FR-009**: Summary metrics, insights, and digests MUST render for the current filter window and show clear error states when unavailable.
- **FR-010**: Notifications MUST list subject, status, and reason details, and display an explicit empty state when none exist.
- **FR-011**: The UI MUST preserve existing layout structure, labels, and interaction patterns so users can complete tasks without retraining.
- **FR-012**: Interactive controls MUST provide consistent keyboard navigation, focus behavior, and clear affordances for all actions.

### Key Entities *(include if feature involves data)*

- **Call**: A single call record with status, agency, service type, location, audio, transcript, and feedback history.
- **Incident**: A grouped set of related calls with rollups, status bucket, member calls, and feedback history.
- **Filters**: A saved set of criteria (time window, type, jurisdiction, agencies, service types, status, map mode).
- **Summary Metrics**: Aggregated counts and digest summaries for a filter window.
- **Map Point**: A geographic representation of a call or incident used for markers or heatmaps.
- **Notification**: A system-generated alert tied to a call or incident with status and reason.
- **Feedback**: User confirmations or flags applied to call or incident fields.

### Assumptions and Dependencies

- The current data services continue to provide calls, incidents, summaries, map points, and notifications with the same fields and update cadence.
- Audio and transcript assets remain accessible wherever they are currently stored.
- Map provider credentials are available in the runtime environment for geographic views.
- Real-time status indicators remain available for display in the header.

### Scope Boundaries

- The work is limited to the frontend experience; no changes are made to data processing, incident grouping, or summarization logic.
- No new workflows or data fields are introduced beyond existing functionality.
- User access and permissions remain unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of baseline P1 workflows (filters, summary, calls list, incidents board, detail views, feedback) pass parity checks against the current UI.
- **SC-002**: At least 95% of view transitions render usable content within 2 seconds under typical operational data volume.
- **SC-003**: For a sampled set of at least 50 filter combinations, counts and labels match the baseline UI results.
- **SC-004**: 90% of pilot users report no functional regressions and confirm they can complete core tasks without assistance.
