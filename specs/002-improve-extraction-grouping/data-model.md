# Phase 1 Data Model: Extraction & Grouping Accuracy v2

## Entities

### ExtractionArtifactV2
- **Description**: Versioned extraction payload per call with evidence and
  confidence.
- **Fields**:
  - schema_version (required, "extraction.v2")
  - call_id (required)
  - extracted_at (required, ISO timestamp)
  - confidence_overall (required, 0-1)
  - incident_type (nullable string)
  - priority (nullable string)
  - jurisdiction (nullable string)
  - channel (nullable string)
  - talkgroup (nullable string)
  - units (array of strings, can be empty)
  - incident_id (nullable string)
  - address_raw (nullable string)
  - address_normalized (nullable string)
  - cross_street_1 (nullable string)
  - cross_street_2 (nullable string)
  - landmark (nullable string)
  - city (nullable string)
  - notes (nullable string)
  - field_confidence (required, map field -> 0-1)
  - evidence (required, map field -> EvidenceItem[])
- **Relationships**:
  - belongs to Call
  - references AIInvocation

### EvidenceItem
- **Description**: Evidence span for an extracted field or grouping signal.
- **Fields**:
  - text (required, short quoted transcript span)
  - start_char (nullable integer)
  - end_char (nullable integer)
  - segment_id (nullable string)
  - t_start (nullable number)
  - t_end (nullable number)
  - reason (required, short justification)
- **Validation**:
  - Either (start_char, end_char) or (segment_id, t_start, t_end) is required.
  - start_char <= end_char when present.

### GroupingDecisionV2
- **Description**: Grouping decision for a call with explicit signals.
- **Fields**:
  - schema_version (required, "grouping.v2")
  - call_id (required)
  - grouped_at (required, ISO timestamp)
  - decision (required: new_incident | join_incident | no_grouping)
  - incident_id (required, system incident identifier)
  - matched_existing_incident_id (nullable string)
  - confidence (required, 0-1)
  - signals (required, Signal[])
  - explanation (required, short factual text)
  - requires_review (required, boolean)
- **Relationships**:
  - belongs to Call
  - references Incident
  - references AIInvocation

### Signal
- **Description**: Weighted evidence-backed signal used for grouping.
- **Fields**:
  - type (required, enum)
  - value (required, string or structured object)
  - weight (required, 0-1)
  - evidence (optional, EvidenceItem[])

### RollupArtifact
- **Description**: Append-only incident rollup summary version.
- **Fields**:
  - incident_id (required)
  - created_at (required, ISO timestamp)
  - summary (required, short factual text)
  - latest_update (array of short bullet strings)
  - key_fields (object with address, jurisdiction, type, units)
  - confidence (required, 0-1)
  - open_questions (array of strings)
  - included_call_ids (required, array of call IDs)
- **Relationships**:
  - belongs to Incident

### CandidateSet
- **Description**: Limited set of candidate incidents for grouping evaluation.
- **Fields**:
  - call_id (required)
  - window_start (required, ISO timestamp)
  - window_end (required, ISO timestamp)
  - candidates (array of incident references)
  - selection_rules (required, description of filters)
- **Relationships**:
  - belongs to Call

## Validation Rules

- ExtractionArtifactV2 must include evidence for all non-null fields.
- GroupingDecisionV2 requires signals with weights and optional evidence.
- requires_review must be true for low-confidence merges per policy.
- RollupArtifact entries are append-only and never overwrite prior versions.
