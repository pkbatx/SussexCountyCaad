# Feature Specification: Incident-Centric Stability

**Feature Branch**: `003-incident-centric-stability`  
**Created**: 2025-12-20  
**Status**: Draft  
**Input**: User description: "I want the next evolution of SussexCountyCAAD to focus on making incident understanding more stable over time and reducing noise, while keeping the current ingestion, staged pipeline, strict JSON validation, and UI intact. This feature introduces an incident-centric model where the primary unit of work becomes the incident, not just individual calls. Calls continue to be ingested and processed as before, but the system must produce stronger, more consistent incident rollups that update incrementally as new calls arrive. Rollups must not thrash or rewrite history; they should append updates and preserve prior versions so I can see how the incident evolved. Grouping decisions must become more explainable and more conservative. Every time a call is linked to an incident, the system must store a structured explanation of why, including the key signals used, their weights, and the confidence. If confidence is below a defined threshold, the system should avoid auto-merging and instead keep incidents separate while marking the decision as needing attention. I do not want aggressive merges that combine unrelated calls just because they are close in time. Metadata extraction should become more grounded and consistent by incorporating local reference data when available, including street/town and POI references. The system should prefer choosing from provided candidates instead of inventing values. If a location cannot be confidently resolved from the transcript and references, it should stay unknown with low confidence rather than guessing. Evidence spans are required for all populated fields. I also want a feedback mechanism that allows the system to improve without requiring an admin watching it constantly. Feedback can be lightweight and occasional. The system should record when later information contradicts earlier extraction or grouping, and treat that as a correction signal. This feedback must be stored and should influence future grouping and extraction behavior in a bounded way, such as adjusting thresholds or lowering confidence in patterns that repeatedly fail. This is not model fine-tuning; it is local, auditable behavior adjustment. Notifications should become incident-aware. Instead of alerting on every similar call, notifications should be deduplicated at the incident level and only send meaningful updates. The system should still log all notification attempts and support basic routing rules, but the default behavior should reduce spam and emphasize new incidents or significant incident changes. The UI must reflect the incident-centric approach. I want an incident feed view with stable identifiers, clear state and last-update times, and an incident detail view that shows the rollup history, member calls, grouping explanations, and the latest extracted metadata. Calls should remain accessible, but the primary workflow should be navigating incidents. This feature is not about scaling infrastructure, changing storage backends, adding authentication, or replacing the AI provider. It is about stability, explainability, and incident-first usability on top of the working MVP."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Incident-centric monitoring (Priority: P1)

As an operator, I can monitor incidents (not just calls) with stable identifiers and
incremental rollup history so I can understand how each incident evolves over time.

**Why this priority**: This is the primary workflow shift and delivers immediate
operational clarity and reduced noise.

**Independent Test**: Can be fully tested by ingesting multiple calls about a single
incident and verifying a stable incident view with appended rollup history and
explainable grouping decisions.

**Acceptance Scenarios**:

1. **Given** multiple calls about the same event, **When** the system links them,
   **Then** it creates or updates a single incident with a new rollup entry while
   preserving prior rollup versions.
2. **Given** a low-confidence grouping decision, **When** the system evaluates the
   link, **Then** it avoids auto-merge, marks the decision as needing attention,
   and keeps incidents separate.

---

### User Story 2 - Grounded metadata extraction (Priority: P2)

As an operator, I receive extracted incident metadata that is grounded in the
transcript and available reference data so the system avoids invented details and
keeps unknowns explicit.

**Why this priority**: Higher accuracy and consistent extraction improves grouping,
rollups, and trust in the system.

**Independent Test**: Can be fully tested by running extraction on transcripts with
and without reference candidates and verifying evidence-backed fields and unknowns.

**Acceptance Scenarios**:

1. **Given** transcript text with matching reference candidates, **When** extraction
   runs, **Then** the chosen values come from the candidates and include evidence
   spans for each populated field.
2. **Given** a transcript with ambiguous or missing location details, **When**
   extraction runs, **Then** location fields remain unknown with low confidence
   and no invented values.

---

### User Story 3 - Incident-aware notifications (Priority: P3)

As an operator, I receive notifications that are deduplicated by incident and only
send meaningful updates so alerts are informative rather than noisy.

**Why this priority**: Reducing alert spam increases operator trust and focus.

**Independent Test**: Can be fully tested by simulating multiple calls for one
incident and verifying that only new incidents or significant changes trigger
notifications, while all attempts are logged.

**Acceptance Scenarios**:

1. **Given** a new incident, **When** the incident is created, **Then** a single
   notification is sent and logged.
2. **Given** additional calls that do not materially change the incident, **When**
   they are processed, **Then** notifications are suppressed and the suppression
   is logged.

---

### User Story 4 - Feedback and correction signals (Priority: P4)

As a system operator, I can rely on lightweight feedback signals that capture
contradictions over time so the system improves without constant manual review.

**Why this priority**: Feedback enables bounded, auditable adjustments that reduce
repeat errors without model retraining.

**Independent Test**: Can be fully tested by introducing a contradiction between
later and earlier extraction/grouping and verifying a stored correction signal and
bounded behavior adjustment on subsequent decisions.

**Acceptance Scenarios**:

1. **Given** a later update that conflicts with earlier extraction or grouping,
   **When** the system detects the contradiction, **Then** it records a feedback
   signal tied to the incident and decision history.
2. **Given** accumulated feedback on a recurring pattern, **When** a new decision
   uses that pattern, **Then** confidence or thresholds are adjusted within defined
   bounds and the adjustment is auditably recorded.

---

### Edge Cases

- Multiple incidents occur close in time on the same street but are unrelated.
- Reference data is missing or incomplete for an otherwise clear location.
- A later call provides higher-quality evidence that conflicts with earlier fields.
- A notification would be suppressed even though the incident gained a significant
  change; the system must still send updates for material changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain incidents as primary entities with stable
  identifiers while keeping call ingestion unchanged.
- **FR-002**: System MUST append incident rollup updates as new versions and MUST
  preserve prior rollup history.
- **FR-003**: System MUST store a structured grouping explanation for every call
  linked to an incident, including signals, weights, and confidence.
- **FR-004**: System MUST avoid auto-merging when grouping confidence is below the
  defined threshold and MUST mark the decision as needing attention.
- **FR-005**: System MUST keep calls accessible while making incident views the
  primary navigation workflow.
- **FR-006**: System MUST ground metadata extraction in transcript evidence and
  available reference candidates, preferring candidate values over invention.
- **FR-007**: System MUST allow unknown values with low confidence instead of
  guessing when evidence or references are insufficient.
- **FR-008**: System MUST require evidence spans for every populated extraction
  field.
- **FR-009**: System MUST record contradiction-based feedback signals and tie them
  to the affected incident, calls, and decisions.
- **FR-010**: System MUST apply feedback to future extraction and grouping behavior
  in a bounded, auditable way without changing external AI providers.
- **FR-011**: System MUST send incident-aware notifications that are deduplicated
  by incident and only send for new incidents or significant updates.
- **FR-012**: System MUST log all notification attempts, including suppressed ones,
  with the reason for suppression.
- **FR-013**: System MUST preserve compatibility with the existing staged pipeline,
  strict JSON validation, and UI surfaces.

**Dependencies and Assumptions**:
- Reference data (street, town, POI) may be provided and curated locally, but the
  system remains functional when it is absent.
- The confidence threshold for auto-merge is defined and adjustable within safe
  bounds to support conservative behavior.

### Key Entities *(include if feature involves data)*

- **Incident**: Stable incident record with current state and identifiers.
- **Call**: Individual call record linked to zero or one incident.
- **Incident Rollup Version**: Append-only snapshot of incident summary and key
  fields at a point in time.
- **Grouping Decision**: Structured explanation for linking or not linking a call
  to an incident, including signals and confidence.
- **Extraction Record**: Versioned metadata extraction output with evidence spans.
- **Evidence Span**: Transcript-based evidence with position references.
- **Reference Data**: Local street, town, and POI candidates used for grounding.
- **Feedback Signal**: Stored contradiction signal that informs bounded adjustments.
- **Notification Event**: Logged notification attempt with routing and suppression
  details.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of incident rollup updates append a new version while preserving
  prior rollup history for operator review.
- **SC-002**: At least 95% of populated extraction fields include evidence spans,
  and 100% of fields with confidence above 0.80 have evidence.
- **SC-003**: 100% of grouping decisions below the defined confidence threshold are
  marked for attention and do not auto-merge.
- **SC-004**: Notification volume per incident is reduced by at least 50% while
  still alerting on new incidents and significant incident changes.
