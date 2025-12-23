# Data Model: Realtime Pipeline & UI Updates

## Existing Entities (no removal)

### calls
- call_id (PK), source_path, first_seen_at, status
- service_type, re_alert_flag, created_at, updated_at

### transcripts
- transcript_id (PK), call_id (FK), run_id (FK)
- text, language, confidence, created_at

### metadata_extracts
- extract_id (PK), call_id (FK), run_id (FK)
- schema_version, payload_json, confidence_summary, created_at

### incident_groups
- incident_id (PK)
- normalized_address, incident_identifiers
- group_confidence, created_at, updated_at
- call_count, re_alert_count

### incident_group_members
- incident_id (FK), call_id (FK)
- link_reason, link_confidence, created_at

### summaries
- summary_id (PK), subject_type, subject_id
- run_id, summary_text, created_at, version

### digest_summaries
- digest_id (PK), window_label, window_start, window_end
- call_count_window, summary_text, summary_json
- created_at, updated_at

### insight_metrics
- metric_id (PK), window_start, window_end
- metric_type, group_key, value, created_at

## Additions / Adjustments for this feature

### incident_groups (additive fields if missing)
- status (Active | Monitoring | Responded)
- last_activity_at (ISO timestamp derived from latest transcript/call activity)

### summaries
- Summary versions increment per transcript change and are retained for history.

## Derived / Computed Fields (no schema change required)

- Lifecycle state derived from last_activity_at and configured thresholds.
- Filterable fields (agency, town, incident_type) derived from latest rollup/summary when present.
