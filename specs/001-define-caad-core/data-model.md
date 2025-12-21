# Data Model: SussexCountyCAAD Core Workflow

## Entities and Fields

### Call

- `call_id` (string, SHA-256 hash of audio content, primary key)
- `source_path` (string, original file path)
- `file_size_bytes` (integer)
- `audio_format` (string, optional)
- `first_seen_at` (timestamp)
- `status` (enum: pending|processing|complete|error)
- `duplicate_of_call_id` (string, optional)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### CallStage

- `call_id` (string, FK to Call)
- `stage_name` (enum: audio|transcription|extraction|summary|grouping|geo|notification)
- `status` (enum: pending|running|succeeded|failed)
- `attempt_count` (integer)
- `last_run_id` (string, FK to StageRun)
- `last_error` (string, nullable)
- `started_at` (timestamp, nullable)
- `completed_at` (timestamp, nullable)

### StageRun

- `run_id` (string, primary key)
- `call_id` (string, FK to Call)
- `stage_name` (enum)
- `attempt_number` (integer)
- `status` (enum: running|succeeded|failed)
- `started_at` (timestamp)
- `completed_at` (timestamp, nullable)
- `error_detail` (string, nullable)

### Transcript

- `transcript_id` (string, primary key)
- `call_id` (string, FK to Call)
- `run_id` (string, FK to StageRun)
- `text` (text)
- `language` (string, nullable)
- `confidence` (float, nullable)
- `created_at` (timestamp)

### MetadataExtract

- `extract_id` (string, primary key)
- `call_id` (string, FK to Call)
- `run_id` (string, FK to StageRun)
- `schema_version` (string)
- `payload_json` (text, validated JSON)
- `confidence_summary` (float, nullable)
- `created_at` (timestamp)

### Summary

- `summary_id` (string, primary key)
- `subject_type` (enum: call|incident)
- `subject_id` (string, call_id or incident_id)
- `run_id` (string, FK to StageRun)
- `summary_text` (text)
- `created_at` (timestamp)
- `version` (integer, incrementing)

### IncidentGroup

- `incident_id` (string, primary key)
- `normalized_address` (string, nullable)
- `incident_identifiers` (text, JSON list, nullable)
- `group_confidence` (float)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### IncidentGroupMember

- `incident_id` (string, FK to IncidentGroup)
- `call_id` (string, FK to Call)
- `link_reason` (string)
- `link_confidence` (float)
- `created_at` (timestamp)

### LocationCandidate

- `location_id` (string, primary key)
- `subject_type` (enum: call|incident)
- `subject_id` (string)
- `raw_text` (string)
- `normalized_text` (string, nullable)
- `geocode_json` (text, nullable)
- `confidence` (float, nullable)
- `created_at` (timestamp)

### Notification

- `notification_id` (string, primary key)
- `subject_type` (enum: call|incident)
- `subject_id` (string)
- `channel` (enum: groupme|discord)
- `routing_rule` (string)
- `dedupe_key` (string)
- `status` (enum: queued|sent|failed|skipped)
- `sent_at` (timestamp, nullable)
- `error_detail` (string, nullable)
- `created_at` (timestamp)

### AIInvocation

- `invocation_id` (string, primary key)
- `call_id` (string, FK to Call)
- `stage_name` (enum)
- `provider` (string)
- `model` (string, nullable)
- `request_json` (text)
- `response_json` (text)
- `token_usage` (text, nullable)
- `latency_ms` (integer, nullable)
- `status` (enum: succeeded|failed|invalid_json)
- `created_at` (timestamp)

### SchemaMigration

- `version` (string, primary key)
- `applied_at` (timestamp)
- `checksum` (string)

## Relationships

- Call → CallStage (1:many)
- Call → StageRun (1:many)
- Call → Transcript (1:many)
- Call → MetadataExtract (1:many)
- Call → Summary (1:many)
- Call → IncidentGroupMember (1:many)
- IncidentGroup → IncidentGroupMember (1:many)
- IncidentGroup → Summary (1:many)
- Call/IncidentGroup → LocationCandidate (1:many)
- Call/IncidentGroup → Notification (1:many)
- Call → AIInvocation (1:many)

## Validation Rules

- `call_id` must be unique and derived from audio content hash.
- One CallStage per call per `stage_name`.
- StageRun `attempt_number` increments monotonically per call and stage.
- All AI outputs stored in `payload_json` must validate against schemas.
- Grouping links require recorded `link_reason` and `link_confidence`.
- Notifications require unique `dedupe_key` per channel within the rate-limit window.

## State Transitions

- CallStage: pending → running → succeeded/failed; retry increments
  `attempt_count` and creates a new StageRun.
- Call status: pending → processing → complete/error based on stage outcomes.
