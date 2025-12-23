# Feature Specification: Integrated UI + AI Upgrade

**Feature Branch**: `007-ui-ai-upgrade`  
**Created**: 2025-12-21  
**Status**: Draft  
**Input**: User description: "Redesign the system as an integrated AI + UI product with a stable, normalized extraction pipeline, incident-centric grouping, re-alert logic, deterministic insights, and a three-column operational UI with audio playback, map context, and lightweight feedback."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Triage Incidents with Clean, Normalized Data (Priority: P1)

Operators need an incident-centric view that shows stable, normalized fields (agency, service type, incident type, address/town) with clear status and audio playback, without model-centric artifacts.

**Why this priority**: This is the primary operational workflow and must be reliable before any advanced insights or feedback flows matter.

**Independent Test**: Can be fully tested by ingesting a call and verifying the UI renders an incident card with normalized fields and audio playback.

**Acceptance Scenarios**:

1. **Given** a new call with a recognizable filename agency, **When** the incident list loads, **Then** the incident card shows normalized agency, service type, incident type (or "Unspecified"), address/town if available, call count, and last update time.
2. **Given** a call with no valid location candidates, **When** the incident card renders, **Then** location is shown as "Unmapped" without errors or speculative values.
3. **Given** a call with audio, **When** the operator clicks play from the call row, **Then** audio plays in a persistent player without exposing file paths.

---

### User Story 2 - Operational Awareness with Deterministic Insights (Priority: P2)

Operators need deterministic, explainable insights (agency activity, re-alerts, attention flags) that update with filters and selections.

**Why this priority**: Operators rely on activity awareness; insights must be explainable and derived from stored fields.

**Independent Test**: Can be fully tested by ingesting multiple calls across agencies and verifying insights and re-alert indicators update deterministically.

**Acceptance Scenarios**:

1. **Given** multiple incidents across agencies, **When** the operator filters agencies, **Then** the activity column and incident list update consistently.
2. **Given** two calls that meet re-alert criteria, **When** the incident view refreshes, **Then** the re-alert tag and counts appear based on the defined window and agency match.
3. **Given** failed stages or missing normalized fields, **When** insights render, **Then** the incident is flagged as "Needs Attention" with no generated narrative.

---

### User Story 3 - Lightweight Feedback for Corrections (Priority: P3)

Operators need a fast feedback path to correct grouping, location, or type without admin workflows, and see the UI update promptly.

**Why this priority**: Feedback is a core mechanism for improving quality while staying local-first and auditable.

**Independent Test**: Can be tested by submitting feedback on a call and confirming immediate UI state change and queued reprocessing.

**Acceptance Scenarios**:

1. **Given** a call detail view, **When** the operator submits "wrong location", **Then** the UI reflects the correction state immediately and reprocessing is queued.
2. **Given** an incident detail view, **When** the operator submits "wrong grouping", **Then** the incident shows "Needs Attention" until reprocessing completes.

---

### Edge Cases

- What happens when no reference candidates match any transcript location?
- How does the system handle multiple agencies appearing within the same incident?
- What happens when re-alert timing is exactly at the window boundary?
- How does the UI behave when map coordinates are missing for all results?
- What happens when feedback is submitted for a call that has no incident assignment yet?

## Constitution Alignment *(mandatory)*

- **Local-first durability + idempotency**: No changes to local-first storage, staged pipeline, or retry semantics.
- **Deterministic call identity + read-only calls input**: No changes to call hashing or read-only input constraints.
- **AI output schema + validation**: Strict JSON validation and repair remain; UI consumes normalized outputs only while internal validation signals remain stored.
- **Conservative grouping + incremental summaries**: Under-grouping is preferred; rollups remain incremental and versioned.
- **Failure visibility + retry paths**: UI continues to surface stage outcomes as succeeded/failed/retry indicators.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST derive agency solely from filename tokens and normalize it deterministically.
- **FR-002**: System MUST normalize service type to one of: EMS, Fire, or Special.
- **FR-003**: System MUST perform deterministic preprocessing before model extraction (agency, service type, timestamps).
- **FR-004**: System MUST narrow candidates using local reference data and similarity ranking, and the model MUST select from provided candidates or return null.
- **FR-005**: System MUST not invent addresses, towns, or POIs; unknown fields remain null/empty.
- **FR-006**: UI-facing extraction outputs MUST exclude confidence and evidence fields while internal validation signals MAY persist.
- **FR-007**: Grouping MUST be conservative and incident-centric; prefer under-grouping over over-grouping.
- **FR-008**: Incident rollups MUST be incremental and must not overwrite history.
- **FR-009**: System MUST compute re-alert flags when a call belongs to the same incident, same agency, and within a configurable 5–7 minute window (default 7 minutes).
- **FR-010**: System MUST store per-call re-alert flags and per-incident/per-agency re-alert counts.
- **FR-011**: System MUST compute deterministic aggregates for insights: call counts per incident, re-alert counts, activity by agency/town, top addresses/towns/POIs, and incidents needing attention.
- **FR-012**: UI MUST present a three-column layout: agencies/activity (left), incidents/calls (center), map context (right), all visible concurrently.
- **FR-013**: UI MUST render incidents as the primary view and allow toggling calls without showing filenames, hashes, file paths, or internal IDs.
- **FR-014**: UI MUST provide a persistent audio player for call playback without exposing raw file paths.
- **FR-015**: UI MUST show only incidents/calls with validated coordinates on the map and keep unmapped items visible in the center column.
- **FR-016**: UI MUST provide stable operational tags only: New, Updated, Multi-Call, Re-alert, Unmapped, Needs Attention.
- **FR-017**: UI MUST support lightweight feedback (wrong grouping, wrong location, wrong type) with immediate UI updates and queued reprocessing.
- **FR-018**: Insight indicators MUST be explainable from stored fields and MUST NOT include generated narratives.

### Key Entities *(include if feature involves data)*

- **Call**: A single ingested audio event with normalized agency, service type, type, location, timestamps, and re-alert flags.
- **Incident**: A conservative grouping of calls with incremental rollups and deterministic aggregates.
- **Agency**: Normalized, deterministic identifier derived from filename tokens.
- **Service Type**: One of EMS, Fire, Special.
- **Location**: Normalized address, town, and optional POI derived from candidates or null.
- **Re-alert**: Flag and count metrics based on incident, agency, and time window logic.
- **Insight Metric**: Deterministic aggregate values used for UI awareness.
- **Feedback Event**: Operator correction signals used to queue reprocessing and improve outputs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of calls with recognizable filename tokens display a normalized agency and service type; unrecognized filenames display "Unknown" rather than inferred values.
- **SC-002**: 100% of UI-facing extraction records contain only normalized fields (no confidence or evidence fields).
- **SC-003**: Re-alert flags are computed for all eligible calls within one processing cycle after grouping.
- **SC-004**: UI filters update incident, call, and map views within 5 seconds of user input under normal operation.
- **SC-005**: Feedback submissions update the UI state within 5 seconds and queue reprocessing for affected records.

## Assumptions & Dependencies

- Assumes existing ingestion, storage, and staged pipeline remain in place and are not replaced.
- Assumes local reference data (streets, towns, POIs) is available and kept current.
- Assumes geocoded coordinates are available for some calls/incidents; unmapped items remain list-only.
- Assumes AI provider integration remains OpenAI via the existing abstraction layer.
