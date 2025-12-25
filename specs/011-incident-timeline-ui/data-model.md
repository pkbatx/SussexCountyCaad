# Data Model: Incident Timeline Console

## TimelineEvent

**Represents**: A time-ordered incident event spanning dispatch actions, calls, radio/audio, transcript segments, and insights.

**Fields**:
- event_id
- incident_id
- event_type (dispatch_action, call, radio, transcript_segment, insight)
- source_id (call_id, audio_id, transcript_id, summary_id)
- occurred_at (timestamp)
- created_at
- title
- summary
- contributes_to_summary (boolean)
- audio_ref (optional)
- transcript_ref (optional)
- key_facts (structured key/value)
- parent_event_id (optional for nested calls)

**Relationships**:
- Belongs to Incident
- May reference AudioSegment and TranscriptSegment
- May link to SummaryEvidenceLink entries

## AudioSegment

**Represents**: A time-bounded audio recording tied to a timeline event.

**Fields**:
- audio_id
- call_id
- event_id
- start_ms
- end_ms
- uri
- duration_ms

**Relationships**:
- Belongs to TimelineEvent
- Aligns to TranscriptSegment entries

## TranscriptSegment

**Represents**: Time-aligned transcript text for an audio segment.

**Fields**:
- segment_id
- event_id
- audio_id
- start_ms
- end_ms
- speaker_label
- text
- confidence

**Relationships**:
- Belongs to AudioSegment and TimelineEvent
- Can be referenced by SummaryEvidenceLink

## SummaryStatement

**Represents**: A persistent statement summarizing incident state.

**Fields**:
- statement_id
- incident_id
- statement_text
- updated_at
- priority

**Relationships**:
- Linked to SummaryEvidenceLink

## SummaryEvidenceLink

**Represents**: Evidence mapping between summary statements and transcript/audio.

**Fields**:
- link_id
- statement_id
- event_id
- transcript_segment_id
- audio_start_ms
- audio_end_ms
- created_at

**Relationships**:
- Belongs to SummaryStatement
- References TimelineEvent and TranscriptSegment

## PlaybackCursor

**Represents**: Shared playback position for UI synchronization.

**Fields**:
- incident_id
- event_id
- position_ms
- updated_at
- source (user_seek, event_select, autoplay)

**Relationships**:
- Drives UI highlight for TimelineEvent and TranscriptSegment
