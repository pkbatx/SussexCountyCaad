# Feature Specification: Incident Timeline Console

**Feature Branch**: `011-incident-timeline-ui`  
**Created**: 2025-12-23  
**Status**: Draft  
**Input**: User description: "Design a dispatch-grade incident timeline interface that unifies calls, radio audio, transcripts, and automated summaries into a single time-ordered workflow. Rework the existing layout so there is one primary vertical timeline ordered by precise timestamps. This timeline is the authoritative record of the incident. Every dispatch action, call, radio transmission, transcript segment, and system-generated insight must appear as an event on this shared timeline rather than being split across separate sections. Each timeline entry should expand inline. When expanded, it must reveal the associated radio audio with a waveform player, a transcript view synchronized to the audio where selecting any line seeks playback to that moment, and a compact structured panel showing key facts extracted from that source. Audio, transcript, and derived insights must be clearly bound to the same underlying event. Eliminate the standalone calls list. Calls should appear as nested elements under the dispatch events that produced them, using indentation and hierarchy to make relationships obvious while keeping the timeline readable. Remove the separate rollup history section. Instead, maintain a persistent incident summary panel that is continuously derived from timeline events. Each timeline item should indicate whether it contributes to the summary, and interacting with a summary statement should reveal the specific transcript lines and audio segments that support it. Make temporal relationships explicit. The UI should clearly convey ordering, overlap, and progression so an operator can immediately understand what happened, what is happening now, and how information evolved over time without scanning multiple views. Introduce a global playback cursor so audio, transcript focus, and timeline position stay synchronized. Selecting a timeline event should move playback to the relevant moment, and seeking within audio should update the timeline focus. Adjust the visual treatment of automated features so they blend naturally into the interface rather than standing out as a distinct or overtly “AI-branded” layer. Use neutral, utilitarian styling that matches the rest of the dispatch console and emphasizes function and trust over novelty. Optionally include a secondary relationship view using a node-based diagram to show how incidents, calls, audio segments, transcripts, and summaries relate to each other, but keep the primary interaction model centered on the time-based timeline. The end result should feel like a professional, real-time dispatch console that is accurate, cohesive, and auditable, enabling rapid understanding of an incident from initial dispatch through ongoing response without unnecessary visual or cognitive friction."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Incident Timeline (Priority: P1)

As a dispatcher, I need a single time-ordered timeline that contains every incident event (dispatch actions, calls, radio audio, transcripts, and system insights) so I can understand the incident without switching views.

**Why this priority**: This is the core operational view and replaces fragmented lists; it must work as a standalone workflow.

**Independent Test**: Can be fully tested by loading a single incident and verifying every source appears in a single timestamped timeline with correct order and nesting.

**Acceptance Scenarios**:

1. **Given** an incident with multiple calls, radio updates, transcripts, and system insights, **When** the incident view loads, **Then** a single chronological timeline renders all events in timestamp order with nested call items under their dispatch event.
2. **Given** a timeline entry with audio and transcript data, **When** the entry is expanded, **Then** the audio player, synchronized transcript, and key facts panel are shown inline for that event.

---

### User Story 2 - Synchronized Playback Cursor (Priority: P2)

As a dispatcher, I need audio, transcript focus, and timeline position to stay synchronized so I can follow an incident in real time and quickly jump to the correct moment.

**Why this priority**: Operators must trust the playback context during active monitoring and review.

**Independent Test**: Can be fully tested by interacting with the playback controls and verifying timeline focus and transcript highlighting follow the playback position.

**Acceptance Scenarios**:

1. **Given** a timeline event with audio and transcript segments, **When** I play audio or seek within the waveform, **Then** the transcript focus and timeline highlight update to the correct moment.
2. **Given** multiple timeline events with audio, **When** I select a different event, **Then** the global playback cursor moves to that event’s time and updates the timeline focus.

---

### User Story 3 - Evidence-Linked Incident Summary (Priority: P3)

As a dispatcher, I need a persistent incident summary panel derived from timeline events so I can see the evolving situation and trace statements back to supporting evidence.

**Why this priority**: The summary reduces cognitive load while retaining auditability and trust.

**Independent Test**: Can be fully tested by verifying summary statements map to specific transcript lines and audio segments in the timeline.

**Acceptance Scenarios**:

1. **Given** a summary statement derived from timeline events, **When** I select that statement, **Then** the supporting transcript lines and audio segments are revealed and highlighted.
2. **Given** an incident with new incoming events, **When** the timeline updates, **Then** the summary panel refreshes to include relevant new statements without removing prior evidence links.

---

### Edge Cases

- What happens when an event has no audio or transcript data?
- How does the system handle multiple events with identical timestamps?
- What happens when a summary statement has no valid supporting evidence?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render a single, vertical, time-ordered timeline that contains all incident events from all sources.
- **FR-002**: System MUST display calls as nested elements under the dispatch events that produced them, using visual hierarchy and indentation.
- **FR-003**: System MUST allow each timeline entry to expand inline and reveal audio, transcript, and key facts bound to the same event.
- **FR-004**: System MUST synchronize timeline focus, audio playback, and transcript highlighting with a global playback cursor.
- **FR-005**: Users MUST be able to select a transcript line and seek playback to that moment.
- **FR-006**: Users MUST be able to select a timeline event to move playback to that event’s timestamp.
- **FR-007**: System MUST provide a persistent incident summary panel derived from timeline events.
- **FR-008**: Each timeline entry MUST indicate whether it contributes to the incident summary.
- **FR-009**: Selecting a summary statement MUST reveal the specific evidence (transcript lines and audio segments) supporting it.
- **FR-010**: The UI MUST make ordering, overlap, and progression of events visually clear without requiring users to switch views.
- **FR-011**: Automated insights MUST be visually integrated with the same neutral styling as other events and avoid distinct AI branding.
- **FR-012**: The interface MUST support optional relationship visualization without replacing the primary timeline workflow.

### Key Entities *(include if feature involves data)*

- **Timeline Event**: A time-stamped record representing a dispatch action, call, radio segment, transcript segment, or system insight.
- **Audio Segment**: A time-bounded recording associated with a timeline event.
- **Transcript Segment**: Time-aligned text tied to an audio segment and timeline event.
- **Summary Statement**: A persistent statement derived from one or more timeline events, linked to supporting evidence.
- **Playback Cursor**: A shared time position that controls audio playback, transcript focus, and timeline highlight.

### Assumptions

- The timeline view is available within the existing incident detail experience and does not require separate authentication or roles.
- Summary statements can be refreshed continuously based on new timeline events without blocking ingestion.
- Relationship visualization is optional and may be omitted without blocking the primary timeline workflow.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of incident events appear on the unified timeline in correct chronological order within 5 seconds of availability.
- **SC-002**: Operators can locate the most recent incident update within 10 seconds using the timeline alone.
- **SC-003**: 90% of summary statements show at least one linked transcript line and audio segment on first view.
- **SC-004**: Playback seeks update timeline focus and transcript highlights within 2 seconds of the seek action.
