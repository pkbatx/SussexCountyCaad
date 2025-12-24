# Feature Specification: Incident-Centric Cohesion UI

**Feature Branch**: `002-incident-cohesion-ui`  
**Created**: 2025-12-23  
**Status**: Draft  
**Input**: User description: "The UI needs to be refocused around incidents at the top,. Top right should have a seconds timer and should use 24 hour time. Audio player needs better UI that looks cooler. Calls should go through the transcription process and have an incdent pending while its analysing then t should be transition to the Incidnet naturally. Remove anything that is confusing like Calls vs Incident counts and rewrite with more info. Incident digest should be summarized by incident, these are correctly tied to the same incident, but it is showing 4 individual calls INCIDENT DIGEST (LAST 24H) Sussex County FM — Fire Marshal responding to 133 Lawrence Road, Andover Township for reported structure fire, cross Germany Flat Road. Newton EMS — Rehab and ambulance assignment to 133 Lawrence Road, Andover Township for house fire. Newton FD — Dispatched to 133 Lawrence Road, Andover Township for reported structure fire; fire in garage attached to residence. Andover Twp Boro — 22 Fire, 32 Fire responding to 133 Lawrence Road for garage fire. MOST ACTIVE AGENCIES Andover. Please make comprehensive changes to the UI to better support the call/incidnet cohesiion. Calls should be navigatable as a drill down per incdent. Remove this kind of detail from the calls, and just make it end user acceptable as for a confidence level that the call belongs with the incdent rollup historry is incoherent so redisgn that as well removing internal references like fractions or decimals for weighting make it end user facing with signals that are designed for a normal non dev to udnerstand Sussex County FM · Special • join_incident: address match 0.50, jurisdiction match 0.22, text similarity 0.12, time proximity 0.08; confidence 0.92; no review • 12/23/2025, 10:52:43 AM Newton FD · Fire • join_incident: address match 0.90, text similarity 0.70; confidence 0.93; no review • 12/23/2025, 10:39:31 AM Newton EMS · EMS • join_incident: address match 0.50, jurisdiction match 0.25, text similarity 0.12, time proximity 0.05; confidence 0.92; no review • 12/23/2025, 10:47:01 AM Andover Twp Boro • new_incident: address match 0.25, text similarity 0.20, unit overlap 0.10, jurisdiction match 0.10; confidence 0.65; requires review • 12/23/2025, 10:37:34 AM Rollup History Sussex County FM · structure fire · 133 Lawrence Road. Germany Flat Road on the cross, Andover updated 4h ago Sussex County FM · structure fire · 133 Lawrence Road. Germany Flat Road on the cross, Andover updated 4h ago Sussex County FM · structure fire · 133 Lawrence Road. Germany Flat Road on the cross, Andover updated 4h ago Sussex County FM · structure fire · 133 Lawrence Road. Germany Flat Road on the cross, Andover"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Incident-First Operations View (Priority: P1)

As an operator, I land on an incident-first view that surfaces live incident status, a
24-hour clock with seconds, and clear, non-confusing summary metrics.

**Why this priority**: This is the primary monitoring experience and must reduce
cognitive load during active operations.

**Independent Test**: Open the UI and confirm the incident view, header clock, and
summary strip are clear and incident-focused without needing other stories.

**Acceptance Scenarios**:

1. **Given** the UI loads, **When** the operator arrives, **Then** incidents are
   the primary list and calls are not shown as a competing top-level view.
2. **Given** the header is visible, **When** time is displayed, **Then** it uses
   24-hour format with seconds (HH:MM:SS) and updates every second.
3. **Given** summary metrics are shown, **When** the operator reads them, **Then**
   the units and time window are explicit and incident-first (no unlabeled call
   vs incident counts).

---

### User Story 2 - Call-to-Incident Progression (Priority: P2)

As an operator, I see calls move through transcription and analysis into a pending
incident state, then transition naturally into the incident rollup with drill-down
navigation.

**Why this priority**: The UI must reflect live processing and keep calls connected
to incidents without confusion.

**Independent Test**: Ingest a new call and observe pending status, then confirm
it appears under its incident once grouped.

**Acceptance Scenarios**:

1. **Given** a new call is received, **When** it is still being analyzed,
   **Then** it appears as a pending incident item with a clear progress state.
2. **Given** the call is grouped to an incident, **When** the incident is updated,
   **Then** the call transitions into the incident drill-down list without manual
   refresh.
3. **Given** an incident is open, **When** a call is selected, **Then** the call
   detail opens from within the incident context and retains active filters.

---

### User Story 3 - Digest, History, and Confidence Clarity (Priority: P3)

As an operator, I read incident digest summaries and rollup history that are
incident-level, human-readable, and free of internal scoring details, with an
upgraded audio player that is clear and visually polished.

**Why this priority**: Clear summaries and signals are needed for trust and rapid
decision-making without exposing internal scoring logic.

**Independent Test**: Review digest and rollup history and verify one entry per
incident, readable confidence signals, and a clear audio player.

**Acceptance Scenarios**:

1. **Given** the incident digest is displayed, **When** multiple calls belong to
   a single incident, **Then** the digest shows one incident summary with the
   combined context.
2. **Given** rollup history entries are shown, **When** the operator reviews them,
   **Then** entries are deduplicated, human-readable, and avoid numeric weights.
3. **Given** audio is available, **When** playback is used, **Then** the player
   shows track context and clear controls without clutter or ambiguity.

---

### Edge Cases

- What happens when a call never links to an incident within the active window?
- How does the UI handle incidents with many calls spanning a long time range?
- What happens when audio is missing or a transcript is incomplete?
- How does the digest behave when an incident has no new updates in the window?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present incidents as the primary view, with calls
  accessible only as drill-down within incidents.
- **FR-002**: System MUST display a header clock in 24-hour time with seconds and
  update it every second.
- **FR-003**: System MUST replace confusing call vs incident counts with clear,
  labeled, incident-first metrics that include their time window.
- **FR-004**: System MUST summarize the incident digest as one entry per incident
  per time window, even when multiple calls exist.
- **FR-005**: System MUST show call progression states (transcribing, analyzing,
  pending incident) and transition calls into incidents when grouping completes.
- **FR-006**: Users MUST be able to navigate from an incident to its related calls
  without losing the current filter context.
- **FR-007**: System MUST present rollup history as deduplicated, human-readable
  updates that state what changed and when.
- **FR-008**: System MUST replace internal scoring details with user-facing
  confidence tiers (for example High, Medium, Low) and review status labels.
- **FR-009**: System MUST provide an upgraded audio player that shows track
  context, playback controls, and progress in a clear, modern layout.
- **FR-010**: System MUST label ranking sections (such as most active agencies)
  with their basis (incidents or calls) and timeframe.
- **FR-011**: System MUST reflect state changes incrementally without full page
  reloads during active monitoring.

### Key Entities *(include if feature involves data)*

- **Incident**: The primary operational unit shown in the UI, with status and
  summary context.
- **Call**: A single radio call that may be pending or grouped under an incident.
- **Incident Digest Entry**: A per-incident summary for a defined time window.
- **Rollup History Entry**: A human-readable update describing incident changes
  over time.
- **Confidence Signal**: A user-facing tier and review status describing how
  strongly a call belongs to an incident.
- **Transcription Status**: A progress state indicating where the call is in
  processing.

### Assumptions

- Existing data sources already provide incident, call, transcript, and status
  signals that can be displayed without changing user workflows.
- Calls may remain unassigned to an incident and must still be visible and
  accessible.
- Default monitoring windows remain available (for example last 24 hours).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The header clock shows HH:MM:SS in 24-hour time and advances every
  second for a continuous 10-minute observation.
- **SC-002**: In a sample of 20 incidents with multiple calls, the digest shows
  exactly one summary per incident (0 per-call duplicates).
- **SC-003**: 90% of pilot users can locate an incident and open a related call
  drill-down within 30 seconds on first attempt.
- **SC-004**: When incident state changes become available to the UI, the updated
  incident status and grouping appear within 10 seconds without manual refresh.
