# Data Model: Incident-Centric Stability

## Entities

### Incident
- Represents a stable, incident-first record.
- Key fields: incident_id (system), created_at, updated_at, last_rollup_at,
  requires_review (derived from grouping decisions).

### Call
- Represents a single ingested audio call.
- Key fields: call_id, ingested_at, transcript_id, linked_incident_id (nullable).

### Incident Membership
- Links calls to incidents with an explicit decision.
- Key fields: incident_id, call_id, grouping_decision_id, linked_at.

### Grouping Decision
- Stores the structured explanation for linking or not linking a call to an
  incident.
- Key fields: decision_id, call_id, incident_id, decision
  (new_incident | join_incident | no_grouping), confidence (0-1),
  signals (typed list with weights), requires_review (boolean), explanation,
  created_at.

### Rollup Version
- Append-only snapshot of incident summary and key fields at a point in time.
- Key fields: incident_id, rollup_version, summary_text, key_fields_snapshot,
  call_ids_included, created_at.

### Extraction Record
- Versioned structured metadata for a call with evidence spans.
- Key fields: call_id, schema_version, extracted_at, metadata_json,
  field_confidence_json, evidence_json.

### Reference Data
- Local grounding candidates for extraction.
- Key fields: reference_id, type (street | town | poi), canonical_name,
  aliases, active_flag.

### Feedback Signal
- Stores contradiction-based feedback for bounded behavior adjustment.
- Key fields: feedback_id, related_incident_id, related_call_id,
  prior_decision_id (nullable), signal_type, detected_at, adjustment_applied.

### Notification Event
- Logged notification attempt or suppression.
- Key fields: notification_id, incident_id, event_type, target_channel,
  sent_at, suppressed_reason (nullable), routing_rule_id (nullable).

## Relationships

- Incident 1..* Incident Membership (calls linked to incidents).
- Call 0..1 Incident Membership (a call links to at most one incident).
- Call 1..* Extraction Record (versioned extractions).
- Incident 1..* Rollup Version (append-only history).
- Incident 0..* Grouping Decision (decisions tied to the incident).
- Incident 0..* Feedback Signal (contradiction signals).
- Incident 0..* Notification Event (notifications and suppressions).

## Validation Rules

- All confidences and signal weights are constrained to 0–1.
- Any populated extraction field MUST have an evidence span.
- Rollup versions are append-only and never overwritten.
- Grouping decisions below the merge threshold MUST set requires_review=true
  and MUST avoid auto-merge.
- Reference data is optional; extraction must remain valid without it.
- Feedback adjustments are bounded and must be recorded for auditability.

## State Transitions

- Incidents update via appended rollup versions; no new explicit lifecycle
  states are introduced by this feature.
- Calls transition through existing staged pipeline; grouping decisions and
  rollup updates are incremental artifacts.
