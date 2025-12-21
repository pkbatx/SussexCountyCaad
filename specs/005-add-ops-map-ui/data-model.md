# Data Model

## Entities

### Call (API view)
- Fields: call_id, source_path, first_seen_at, status, incident_type, priority, jurisdiction,
  address_raw, address_normalized, grouping_confidence, latitude, longitude.
- Relationships: belongs to an Incident (via incident membership), has many Stages, Transcripts,
  Metadata Extracts, Summaries, Feedback Signals.
- Validation: call_id required; status enum (pending|processing|completed|failed|duplicate);
  confidence values within 0–1; latitude/longitude nullable.

### Incident (API view)
- Fields: incident_id, normalized_address, incident_identifiers, group_confidence, latest_summary,
  last_rollup_at, latest_rollup_version, incident_type, jurisdiction, status, member_count,
  latitude, longitude.
- Relationships: has many Calls (incident_group_members), Rollups, Summaries, Grouping Decisions,
  Feedback Signals.
- Validation: incident_id required; group_confidence within 0–1; status derived from rollup fields.

### Grouping Decision
- Fields: decision_id, call_id, incident_id, confidence, explanation, signals_json, created_at.
- Relationships: ties a Call to an Incident with explainable evidence.
- Validation: confidence within 0–1; explanation required for UI display.

### Map Point
- Fields: entity_type (call|incident), entity_id, latitude, longitude, weight, updated_at, status.
- Relationships: derived from Call or Incident location candidates.
- Validation: latitude/longitude required; weight within 0–1 for heatmap intensity.

### Summary Metrics
- Fields: total_calls, active_incidents, high_priority_calls, failed_stages, notifications_sent.
- Relationships: derived from calls/incidents within filter window.

### Trend Bucket
- Fields: bucket_start, bucket_end, call_count.
- Relationships: derived from call timestamps filtered by time window.

### Hotspot Aggregate
- Fields: hotspot_type (town|street|poi|any), label, count, latitude, longitude (optional),
  last_seen_at.
- Relationships: derived from calls/incidents and reference data.

### Feedback Signal
- Fields: feedback_id, target_type (call|incident), target_id, feedback_type,
  submitted_at, apply_status.
- Relationships: attaches to Call or Incident; drives reprocessing status in UI.

### Filter Set
- Fields: start, end, incident_type, jurisdiction, status, min_confidence, q, limit, offset.
- Relationships: applied to feeds, map points, summaries, trends, and hotspots.

## State Transitions (UI-relevant)
- Call status: pending -> processing -> completed | failed | duplicate.
- Incident status: derived from rollup summaries (active/resolved), updated when new rollup
  versions arrive.
- Feedback signal apply_status: queued -> applied | failed.
