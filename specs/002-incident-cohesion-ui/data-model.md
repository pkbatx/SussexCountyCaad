# Data Model: Incident-Centric Cohesion UI

## Entities

### Incident
- **incident_id**: Unique identifier for the incident.
- **status**: Lifecycle state (active, monitoring, responded).
- **summary**: Current incident summary text.
- **location_label**: Human-readable location (address, town).
- **updated_at**: Last time the incident summary or state changed.
- **last_activity_at**: Most recent call or transcript activity.
- **call_count**: Number of calls grouped to the incident.
- **pending**: Boolean or derived flag indicating this is a pending incident view.

### Call
- **call_id**: Unique identifier for the call.
- **incident_id**: Incident reference (nullable until grouped).
- **agency**: Reporting agency label.
- **service_type**: EMS, Fire, Special, or equivalent.
- **received_at**: Time the call entered the system.
- **transcription_status**: Progress state (received, transcribing, analyzing,
  pending_incident, grouped).
- **audio_url**: Reference to audio playback source.
- **confidence_signal**: User-facing tier and review status.

### Pending Incident (Derived)
- **source_call_id**: Call driving the pending incident view.
- **progress_state**: Mirrors call transcription/analyzing state.
- **display_label**: Minimal summary until grouping completes.

### Incident Digest Entry
- **incident_id**: Incident reference.
- **window_start**: Start of digest window.
- **window_end**: End of digest window.
- **summary**: One consolidated summary per incident per window.
- **updated_at**: Last time the digest entry changed.

### Rollup History Entry
- **incident_id**: Incident reference.
- **changed_at**: Timestamp of the change.
- **change_summary**: Human-readable summary of what changed.
- **change_type**: Created, updated, merged, or resolved.

### Confidence Signal
- **tier**: High, Medium, or Low.
- **review_status**: No review, needs review, or confirmed.
- **reason_label**: Short human-readable signal (no numeric weights).

## Relationships

- **Incident** 1 → many **Call** records.
- **Incident** 1 → many **Rollup History Entry** records.
- **Incident** 1 → many **Incident Digest Entry** records (one per time window).
- **Call** 0..1 → **Incident** (nullable until grouped).
- **Call** 1 → **Confidence Signal** (derived for UI).
- **Pending Incident** is derived from **Call** until incident grouping is complete.

## Validation Rules

- Exactly one **Incident Digest Entry** per incident per time window.
- **Rollup History Entry** must be deduplicated by change summary + timestamp.
- **Call.transcription_status** must follow a monotonic progression from
  received → transcribing → analyzing → pending_incident → grouped.
- **Confidence Signal** tiers are the only user-facing confidence representation;
  raw numeric weights are hidden from the UI.
