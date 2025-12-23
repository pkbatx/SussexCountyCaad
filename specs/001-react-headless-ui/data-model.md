# Data Model: Headless UI Frontend Migration

## Entities

### Call
- **Identifier**: call_id
- **Fields**: status, first_seen_at, agency, service_type, incident_type, address, town, cross_street, poi, summary, re_alert, incident_linked
- **Relationships**:
  - Has many **Stages**
  - Has many **Transcripts**
  - Has many **Summaries**
  - Has many **Feedback** entries
  - Optionally links to an **Incident**
- **Validation Rules**:
  - call_id required
  - status required for list display
  - first_seen_at ISO-8601 when present

### CallDetail
- **Fields**: call (Call), stages, transcripts, summaries, operator_fields, audio, locations, notifications, incidents
- **Operator Fields**: agency, incident_type, address, town, cross_street, poi, summary
- **Audio**: url, format (nullable)

### Stage
- **Fields**: stage_name, status

### Transcript
- **Fields**: transcript_id, text, language, created_at

### Summary
- **Fields**: summary_id, summary_text, created_at, version

### Incident
- **Identifier**: incident_id
- **Fields**: agency, agencies[], incident_type, address, town, cross_street, poi, status, member_count, re_alert_count, latest_summary, last_rollup_at, updated_at
- **Relationships**:
  - Has many **Members** (call links)
  - Has many **Rollups**
  - Has many **Summaries**
  - Has many **Feedback** entries

### IncidentDetail
- **Fields**: incident (Incident), members, member_calls, summaries, rollups, operator_fields, notifications
- **Operator Fields**: agency, incident_type, address, town, cross_street, poi, summary

### IncidentMember
- **Fields**: call_id, link_reason, created_at

### IncidentMemberCall
- **Fields**: call_id, status, first_seen_at, agency, service_type

### Rollup
- **Fields**: rollup_id, incident_id, version, created_at, summary_text, latest_update, key_fields

### MapPoint
- **Fields**: entity_type (call|incident), entity_id, latitude, longitude, weight, updated_at, status (call-only)

### SummaryMetrics
- **Fields**: total_calls, active_incidents, high_priority_calls, re_alert_calls

### InsightMetrics
- **Fields**: window_start, window_end, metrics
- **Metric Items**: group_key or label, value or count

### Digest
- **Fields**: window_label, summary_text, summary_json

### Agency
- **Fields**: agency_id, canonical_name, service_type, last_seen_at, call_count, re_alert_count

### Notification
- **Fields**: notification_id, subject_type, subject_id, channel, routing_rule, dedupe_key, status, sent_at, error_detail, created_at

### Feedback
- **Fields**: feedback_id, target_type (call|incident), target_id, feedback_type, submitted_at, apply_status

### Filters
- **Fields**: start, end, incident_type, jurisdiction, agency[], service_type[], status, map_mode
- **Usage**: Passed as query parameters; not persisted by the UI.

## Relationships

- **Call** → **Incident**: optional many-to-one (calls may link to an incident).
- **Incident** → **Call**: one-to-many via members/member_calls.
- **Call/Incident** → **Feedback**: one-to-many.
- **Call/Incident** → **MapPoint**: one-to-one when geocoding is available.

## State Transitions

- **Call status**: values include pending, processing, active, failed, resolved (as delivered by backend).
- **Incident buckets**: derived from updated timestamps and thresholds (active, monitoring, resolved).
- **Feedback apply_status**: queued → applied or retained queued when not yet processed.
