# Feature Specification: Normalized Agency Fields

**Feature Branch**: `006-normalize-agency-fields`  
**Created**: 2025-12-21  
**Status**: Draft  
**Input**: User description: "I want to simplify and normalize what the system extracts and what the UI presents. Confidence scores, per-field evidence, and other model-centric metadata are no longer end-product features. They may exist internally for debugging or learning, but they must not be part of the primary data model exposed to the UI or operators. The extraction output should move toward industry-standard, normalized fields that operators expect to see. Fields should be either present with a concrete value or absent/null. Do not surface confidence percentages or speculative metadata. If something is unclear, leave it empty rather than qualifying it with confidence language. Agency identification must become a first-class field and should be derived from the filename, not the transcript. The filename is the source of truth for agency. The system should parse and normalize agency names from filenames like the examples provided. Normalization rules should remove non-agency tokens such as 'Duty', 'Gen', 'Siren', or similar operational suffixes for now, and collapse variants into a consistent canonical agency name. For example, filenames like 'Lakeland_EMS__Gen__...', 'Lakeland_EMS__Duty__...', and 'Lakeland_EMS_...' should all normalize to the same agency identity. Fire and EMS distinctions should be preserved when they are part of the agency name (e.g., 'Byram FD' vs 'Byram EMS'), but formatting differences, separators, and noise words should not create separate agencies. The system should maintain a normalized agency registry internally so the same agency name is always rendered consistently in the UI. This enables grouping, filtering, and analytics by agency without relying on AI inference from transcripts. The UI should prominently surface agency as a primary attribute for calls and incidents, alongside type and location. Location extraction should remain focused on normalized address components (street, town, POI when applicable). Avoid speculative enrichment. Use local reference data for streets, towns, and POIs to ground normalization, but only surface the final normalized values, not the candidate lists or matching scores. Grouping and incident summaries should operate on these normalized, stable fields. The UI should show clean, operator-friendly information: agency, incident type, address, town, cross street when available, and a concise summary. Internal pipeline stage status (extraction, grouping, notification, etc.) can be shown as simple succeeded/failed/retry indicators, but detailed model metadata should stay out of the primary views. Overall, this change is about paring the system down to what is operationally meaningful. The goal is a polished, professional UI that feels consistent and trustworthy, where agencies, locations, and incident types are normalized and predictable, and where AI complexity is hidden behind a clean, stable interface."

## Clarifications

### Session 2025-12-21

- Q: Should confidence/evidence be omitted by default with debug-only access? → A: Omit by default; expose only via explicit debug-only endpoint or flag.
- Q: How should missing agency display in UI filters? → A: Display as “Unknown” and include as filterable value.
- Q: How should incident type influence grouping? → A: Use as a secondary signal only (never overrides agency + location).
- Q: How long should agency registry entries be retained without use? → A: 30 days.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operator-facing normalized fields (Priority: P1)

Operators see clean, normalized agency, incident type, and location fields for
calls and incidents without model-centric metadata in the primary UI.

**Why this priority**: This is the core operational experience and must be
consistent and trustworthy for day-to-day decisions.

**Independent Test**: Load a call and incident detail view and verify that
agency, type, and location render cleanly with no confidence/evidence metadata.

**Acceptance Scenarios**:

1. **Given** a call with a filename that encodes agency, **When** the call is
   displayed in the UI, **Then** the agency is shown as a normalized, canonical
   name and confidence/evidence metadata is not shown.
2. **Given** a call with unclear location, **When** the call is displayed,
   **Then** location fields are empty rather than qualified by confidence text.

---

### User Story 2 - Agency normalization + filtering (Priority: P2)

Operators can filter and group by agency using a consistent registry of
canonical agency names derived from filenames.

**Why this priority**: Reliable filtering and grouping by agency removes noise
and improves operational analytics without AI inference.

**Independent Test**: Ingest calls with variant agency filenames and confirm
filters return a single canonical agency label.

**Acceptance Scenarios**:

1. **Given** multiple calls whose filenames contain the same agency with
   different separators or suffixes, **When** the UI filters by agency,
   **Then** all calls appear under one canonical agency name.

---

### User Story 3 - Simplified operational views (Priority: P3)

Operators see only operationally meaningful fields while internal model data is
kept out of primary views, with stage status shown as simple indicators.

**Why this priority**: Reduces cognitive load and prevents AI metadata from
being mistaken as operational truth.

**Independent Test**: Review list and detail views and confirm stage status is
simple and model metadata is hidden.

**Acceptance Scenarios**:

1. **Given** a call with internal confidence/evidence data, **When** the call
   is rendered in feeds and detail views, **Then** only normalized fields and
   concise summaries are shown.

---

### Edge Cases

- What happens when a filename lacks agency tokens?
- How does the system handle agency tokens that only differ by noise words?
- What happens when location fields cannot be grounded by reference data?
- How are calls displayed when incident type is unknown?
- What happens when a call lacks a cross street or POI?

## Constitution Alignment *(mandatory)*

- **Local-first durability + idempotency**: Data remains local; normalization
  changes do not alter persistence guarantees.
- **Deterministic call identity + read-only calls input**: Agency comes from
  filename parsing without mutating the calls directory.
- **AI output schema + validation**: Extraction still uses strict JSON schemas
  internally, but the UI hides model-centric metadata.
- **Conservative grouping + incremental summaries**: Grouping uses normalized
  fields (agency/location/type) and preserves existing rollup behavior.
- **Failure visibility + retry paths**: Stage status remains visible as simple
  succeeded/failed/retry indicators.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose normalized operator fields (agency, incident
  type, address, town, cross street, POI, concise summary) to the UI.
- **FR-002**: System MUST NOT expose confidence scores, evidence spans, or
  model-centric metadata in primary UI views.
- **FR-003**: System MUST derive agency from the filename, not the transcript,
  and treat the filename as the source of truth.
- **FR-004**: System MUST normalize agency names by removing noise tokens
  (e.g., Duty, Gen, Siren) and collapsing formatting variants.
- **FR-005**: System MUST preserve Fire vs EMS distinctions when explicitly
  present in the agency name.
- **FR-006**: System MUST maintain a canonical agency registry so the same
  agency renders consistently across calls and incidents.
- **FR-007**: UI MUST surface agency as a primary attribute alongside type and
  location in calls and incidents feeds and detail views.
- **FR-008**: Location normalization MUST use local reference data and only
  surface final normalized values (street, town, POI), leaving unknowns empty.
- **FR-009**: Grouping and incident summaries MUST operate on normalized
  fields (agency, type, location) without relying on UI-facing confidence data.
- **FR-010**: UI MUST show pipeline stages as simple status indicators without
  detailed model metadata.
- **FR-011**: System MUST normalize agencies using deterministic parsing rules
  that strip noise tokens, preserve service type, canonicalize casing, and
  collapse variants (no AI inference).
- **FR-012**: Operator-facing API responses MUST omit confidence and evidence
  metadata by default, with access only via an explicit debug-only endpoint or
  flag.
- **FR-013**: UI MUST render missing agency as “Unknown” and allow filtering
  by that value.
- **FR-014**: Grouping MUST treat incident type as a secondary signal and it
  MUST NOT override agency + location matches.
- **FR-015**: Agency registry entries MUST be retained for at least 30 days
  after last use before eligible for cleanup.

### Agency Normalization Rules

- Strip noise tokens: Duty, Gen, Siren, Alert, and repeated separators.
- Preserve service type:
  - FD or Fire -> Fire Department (rendered as FD).
  - EMS or Rescue -> EMS.
  - FM -> Fire Marshal (rendered as FM).
- Canonical casing: Title Case words; keep FD, EMS, FM abbreviations.
- Collapse variants (examples):
  - Lakeland_EMS__Gen__* -> Lakeland EMS
  - Franklin_FD__Siren__* -> Franklin FD
  - Newton_EMS__Duty__* -> Newton EMS
- Hyphenated areas remain hyphenated (e.g., Glenwood-Pochuck, Alamuchy-Green).

### Key Entities *(include if feature involves data)*

- **Agency**: Canonical agency identity derived from filename parsing; used for
  filtering, grouping, and display.
- **Normalized Call Fields**: Operator-facing fields such as agency, type,
  address, town, cross street, POI, and summary.
- **Normalized Incident Fields**: Operator-facing incident fields derived from
  normalized call data and rollups.
- **Agency Registry**: Internal mapping of raw filename tokens to canonical
  agency names.

### Agency Registry Reference Set

EMS:
- Alamuchy-Green EMS
- Blue Ridge Rescue
- Franklin EMS
- Glenwood-Pochuck EMS
- Hopatcong EMS
- Lakeland EMS
- Newton EMS
- Sparta EMS
- Sussex Boro EMS
- Wantage EMS
- Fredon EMS

Fire Departments:
- Branchville FD
- Byram FD
- Frankford FD
- Franklin FD
- Fredon FD
- Green FD
- Hamburg FD
- Hardyston FD
- Highland Lakes FD
- Hopatcong FD
- McAfee FD
- Montague FD
- Pochuck FD
- Vernon FD
- Wantage FD
- Andover Twp / Andover Boro FD (combined dispatch entity)

Other / Mixed / County:
- Sussex County FM

### Assumptions & Dependencies

- Calls include filenames with agency tokens that can be parsed consistently.
- Local reference data for streets, towns, and POIs is available for grounding
  location normalization.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of call and incident UI entries show agency as a primary
  attribute when filename tokens are present.
- **SC-002**: 0 occurrences of confidence or evidence metadata appear in
  primary UI views during operator workflows.
- **SC-003**: 90% of filename variants for the same agency map to a single
  canonical agency label on a representative sample set.
- **SC-004**: Unknown or ambiguous location fields display as empty values
  rather than qualified text in 100% of cases tested.
