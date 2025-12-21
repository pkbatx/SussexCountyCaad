# Feature Specification: SussexCountyCAAD Core Workflow

**Feature Branch**: `001-define-caad-core`  
**Created**: 2025-12-20  
**Status**: Draft  
**Input**: User description: "Use this as your natural-language input when you run /speckit.specify. Written as you, complete scope, explicit about AI handling, OpenAI for MVP, no formatting, no headings. -- I want to define exactly what SussexCountyCAAD does. This system watches a configured calls directory for new radio-call audio files and treats each audio file as a single call. The calls directory is external, read-only input. When a new file appears, the system must compute a content hash, generate a stable call identity, and guarantee idempotency so the same audio never results in duplicate calls or duplicated downstream processing. The system includes the AI integration layer as part of its core scope. I do not have an existing AI runner; this project must handle AI invocation itself behind a clean internal interface. For the MVP, AI calls should use OpenAI endpoints so the system can be tested immediately. The design must still allow the AI provider to be swapped later without rewriting ingestion, persistence, or UI logic. Processing is staged and explicit. A call progresses through audio handling, transcription, metadata extraction, summarization, incident grouping, optional geocoding, and notification. Each stage must record status, timing, attempts, and errors. Failures must be visible and retryable. Reprocessing must be safe and deterministic. AI is responsible for more than transcription. After transcription, AI is used to extract structured metadata from the transcript and any available filename or sidecar metadata. This includes incident type, units, location text, cross streets, priority, channel or talkgroup, jurisdiction, and any incident identifiers detected in the audio. AI is also responsible for grouping calls into incidents when multiple calls appear to describe the same underlying event, either by normalized address or by an AI-detected incident identifier or strong matching signals. All AI extraction and grouping outputs must be strict JSON that conforms to defined schemas. No markdown, no prose, no commentary. If the AI response is not valid JSON, the system must reject it and retry with a repair attempt. Every extracted field must include a confidence score, and when possible include evidence references back to transcript spans. Model name, token usage, and latency should be recorded with the artifact when available. Summaries are incremental. Each call has its own summary, and incident groups maintain a rollup summary that updates as new related calls arrive. Incremental updates must preserve prior artifacts and history rather than overwriting them. Grouping must be conservative and explainable: group by normalized address when possible, otherwise by incident ID or strong matching signals, and avoid aggressive merging when confidence is low. Radio transcripts are noisy by nature. Location and geocoding are best-effort. The system must preserve ambiguity rather than forcing a single location. If geocoding is uncertain or impossible, the call and incident must still be processed successfully, with raw location text and confidence retained. All data persists locally. Calls, tasks, transcripts, extracted JSON, summaries, incident groups, locations, notifications, and processing metadata must survive restarts and be reviewable later. Each artifact must be traceable to the call, the processing stage, and the AI invocation that produced it. Schema changes require explicit migrations. The system sends notifications to GroupMe and Discord. Notifications must be deduplicated, rate-limited, and routed using simple rules such as incident type, priority, jurisdiction, or keywords. Notifications must include a concise summary and a link back to a detailed call or incident view. There is a web interface that provides operational visibility. It must show a feed of calls and incidents with filters and clear state indicators, and detailed views where audio, transcripts, extracted metadata, summaries, grouping decisions, locations, processing status, and notification history are visible. Failures and retry actions must be obvious in the UI. This is a local-first system that should be easy to run end-to-end. Configuration lives outside the code. Secrets are never committed. Correctness, traceability, and operator clarity matter more than automation or cleverness. Anything not explicitly described here is out of scope for now."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Process Calls End-to-End (Priority: P1)

As an operator, I drop radio-call audio files into the configured calls
folder and the system ingests each file as a call, assigns a stable identity,
processes it through staged steps, and presents the call status, transcript,
summary, and retry controls in the UI.

**Why this priority**: This is the core operational value and defines the
minimum viable workflow.

**Independent Test**: Place a new audio file in the calls folder and verify a
new call appears with a stable ID, staged statuses, transcript, per-call
summary, and visible retry controls; restart the system and confirm state is
preserved.

**Acceptance Scenarios**:

1. **Given** a new audio file in the read-only calls folder, **When** the
   system detects it, **Then** it creates a new call with a stable identity,
   records staged processing status, and persists artifacts.
2. **Given** a call with a failed stage, **When** an operator triggers retry,
   **Then** the stage re-runs deterministically and the failure history remains
   visible.

---

### User Story 2 - Structured Metadata & Incident Grouping (Priority: P2)

As an operator, I need structured metadata and conservative incident grouping
so related calls are summarized together while preserving uncertainty and
per-call artifacts.

**Why this priority**: It converts noisy audio into actionable incident views
and prevents unsafe merging.

**Independent Test**: Process two calls with a shared address and one call with
ambiguous location; verify strict JSON metadata with confidence scores and
evidence, a group rollup summary for the related calls, and separate groups
when confidence is low.

**Acceptance Scenarios**:

1. **Given** a transcript and optional sidecar metadata, **When** metadata
   extraction runs, **Then** the stored output is valid JSON that includes
   confidence scores and evidence references.
2. **Given** multiple calls with strong matching signals, **When** grouping
   runs, **Then** the system creates or updates an incident group with a rollup
   summary and preserves each call's history.

---

### User Story 3 - Notifications & Routing (Priority: P3)

As an operator, I need routed notifications to GroupMe and Discord with
deduplication and rate limits so stakeholders receive concise updates with
links back to detailed views.

**Why this priority**: Notifications provide timely awareness while avoiding
noise and duplication.

**Independent Test**: Configure routing rules and process calls that match and
do not match the rules; verify notifications are sent once per configured
window with a summary and link, and are logged in notification history.

**Acceptance Scenarios**:

1. **Given** a call or incident that matches routing rules, **When**
   notification delivery runs, **Then** a concise summary with a link is sent
   and recorded.
2. **Given** repeated updates for the same incident, **When** notifications are
   evaluated, **Then** deduplication and rate limits prevent duplicate sends
   within the configured window.

### Edge Cases

- Duplicate audio files appear or the same file is reintroduced.
- Audio is corrupted, silent, or incomplete.
- AI output is invalid JSON or missing required fields.
- Location is ambiguous, conflicting, or cannot be geocoded.
- Grouping signals conflict or are low confidence.
- Notification delivery fails or exceeds rate limits.

## Constitution Alignment *(mandatory)*

- **Local-first durability + idempotency**: All call, task, and artifact data
  persists locally and stages are safe to retry without duplication.
- **Deterministic call identity + read-only calls input**: Calls are keyed by a
  content-based identity derived from the audio; input files remain immutable.
- **AI output schema + validation**: Extraction and grouping outputs must be
  valid JSON against defined schemas; invalid responses are rejected and
  retried with repair.
- **Conservative grouping + incremental summaries**: Groups merge only on
  strong signals, and rollups update without overwriting prior artifacts.
- **Failure visibility + retry paths**: UI surfaces stage status, errors, and
  retry actions for each call and incident.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST watch a configured calls directory and treat each
  audio file as a single call without mutating the input.
- **FR-002**: System MUST compute a content fingerprint for each audio file and
  use it to create a stable, deterministic call identity.
- **FR-003**: System MUST guarantee idempotent processing so the same audio
  never creates duplicate calls or duplicated downstream artifacts.
- **FR-004**: System MUST process calls through explicit stages: audio handling,
  transcription, metadata extraction, summarization, incident grouping,
  optional geocoding, and notification.
- **FR-005**: Each stage MUST record status, timing, attempt count, and errors
  and MUST be safe to retry deterministically.
- **FR-006**: System MUST include an internal AI integration layer and MUST use
  OpenAI as the default provider for the MVP while keeping provider details
  out of ingestion, persistence, and UI logic.
- **FR-007**: Metadata extraction MUST output strict JSON that conforms to a
  defined schema, includes confidence scores, and includes evidence references
  to transcript spans when available.
- **FR-008**: Incident grouping MUST output strict JSON that conforms to a
  defined schema and is conservative and explainable.
- **FR-009**: If AI output is invalid JSON, the system MUST reject it, record
  the failure, and retry with a repair attempt.
- **FR-010**: Each call MUST have a per-call summary, and each incident group
  MUST maintain an incremental rollup summary without overwriting history.
- **FR-011**: Location extraction and geocoding MUST be best-effort and MUST
  preserve raw location text and ambiguity without failing the call.
- **FR-012**: All calls, tasks, transcripts, extracted JSON, summaries,
  incident groups, locations, notifications, and processing metadata MUST
  persist locally and survive restarts.
- **FR-013**: Each artifact MUST be traceable to the call, processing stage,
  and AI invocation that produced it, including model name, token usage, and
  latency when available.
- **FR-014**: Notifications MUST support GroupMe and Discord, be deduplicated
  and rate-limited, and include a concise summary with a link back to the
  call or incident view.
- **FR-015**: The UI MUST provide a feed of calls and incidents with filters,
  clear state indicators, detailed views for artifacts, and visible failure and
  retry actions.
- **FR-016**: Configuration MUST live outside the codebase and secrets MUST
  never be committed.

### Key Entities *(include if feature involves data)*

- **Call**: Represents a single audio file, its stable identity, and lifecycle
  through staged processing.
- **Processing Stage**: Records per-stage status, timing, attempts, and errors
  for a call.
- **Transcript**: The text output derived from audio processing.
- **Metadata Extract**: Structured JSON metadata with confidence scores and
  evidence references.
- **Incident Group**: A conservative grouping of related calls with
  explainable linkage.
- **Summary**: Per-call summaries and incremental incident rollup summaries.
- **Location Candidate**: Raw location text, ambiguity notes, and optional
  geocoding outcomes.
- **Notification**: A delivered or attempted outbound message with routing
  metadata and deduplication context.
- **AI Invocation**: The record of an AI call, including provider, model name,
  usage, latency, and response validity.

### Assumptions & Dependencies

- The calls directory path is configured and accessible on the local system.
- Audio files are complete by the time they are detected by the system.
- OpenAI is available as the default AI provider for the MVP.
- GroupMe and Discord are the only notification destinations in scope.
- Operators manage local data retention and storage capacity.

### Scope Boundaries

- Real-time audio streaming ingestion is out of scope.
- Automated dispatch or call-taking workflows are out of scope.
- Multi-tenant access or public hosting is out of scope.
- Training or fine-tuning AI models is out of scope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of ingested audio files produce a stable call identity and
  never create duplicate call records when reprocessed.
- **SC-002**: 95% of new calls appear in the UI with an initial stage status
  within 1 minute of file arrival during validation runs.
- **SC-003**: 100% of stored AI extraction and grouping artifacts validate
  against their JSON schemas; invalid responses are rejected and logged.
- **SC-004**: 100% of failures expose a visible error state and retry action in
  the UI.
- **SC-005**: Notifications are delivered without duplicates inside the
  configured rate-limit window during validation runs.
