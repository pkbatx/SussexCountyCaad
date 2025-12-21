# Feature Specification: Extraction & Grouping Accuracy v2

**Feature Branch**: `002-improve-extraction-grouping`  
**Created**: 2025-12-20  
**Status**: Draft  
**Input**: User description: "Goal Increase accuracy and stability of: • extracted call metadata from noisy radio transcripts • grouping calls into the correct incident entity over time • incremental incident rollups without summary thrash This feature must stay compatible with the existing staged pipeline, SQLite persistence, strict JSON enforcement, and UI surfaces already shipped. ⸻ 1) Inputs and invariants Inputs • call_id • raw transcript text (and segments/timestamps if available) • normalized filename metadata (time/channel/talkgroup/unit hints) • existing call artifacts (prior extraction, prior grouping decision) • optional operator overrides (if present later) Invariants • Extraction output is strict JSON matching schema. • Grouping output is strict JSON matching schema. • All decisions store confidence and evidence (transcript spans and/or segment references). • System must accept “unknown” rather than hallucinating specifics (especially geo). ⸻ 2) Extraction output schema (v2) Extraction produces a single JSON object per call, versioned. Required top-level fields: • schema_version: extraction.v2 • call_id • extracted_at (ISO) • confidence_overall (0–1) Core fields (nullable when unknown): • incident_type (string | null) • priority (string | null) • jurisdiction (string | null) • channel (string | null) • talkgroup (string | null) • units (array of strings, possibly empty) • incident_id (string | null) — only if explicitly indicated • address_raw (string | null) — verbatim phrase(s) from transcript • address_normalized (string | null) — best effort normalization, may still be partial • cross_street_1 (string | null) • cross_street_2 (string | null) • landmark (string | null) • city (string | null) • notes (string | null) — short, factual, no speculation Per-field confidence + evidence: • field_confidence: object mapping field → 0–1 • evidence: object mapping field → array of evidence items Evidence item: • text (exact quoted span from transcript, short) • start_char / end_char (indices into cleaned transcript) OR (segment_id, t_start, t_end) • reason (short justification, e.g., “explicitly stated”, “strong implication”) Hard rules: • If not supported by evidence, field must be null or empty and confidence low. • Never “invent” a street number, city, or incident ID. • Units list only contains strings that appear in transcript or filename metadata. ⸻ 3) Grouping output schema (v2) Grouping produces a decision: which incident a call belongs to, and why. Required fields: • schema_version: grouping.v2 • call_id • grouped_at (ISO) • decision: new_incident | join_incident | no_grouping • incident_id (string) — system incident identifier (not radio incident id) • matched_existing_incident_id (string | null) — only for joins • confidence (0–1) • signals: list of signal objects • explanation (short, factual) • requires_review (boolean) Signal object: • type: incident_id_match | address_match | cross_street_match | unit_overlap | time_proximity | jurisdiction_match | channel_match | text_similarity • value: string or structured (e.g., normalized address) • weight: 0–1 • evidence: same evidence structure as extraction (when applicable) Hard rules: • Conservative merges by default. • If confidence below threshold (e.g., 0.70), set requires_review=true and prefer new_incident unless there is a strong explicit incident ID match. • Explicit incident ID match can override low address quality, but only if incident ID is evidenced. ⸻ 4) Prompting spec (use the “successful pattern”) Use the same proven pattern you’ve been using for this data: Prompt contract Each AI call must be structured as: • Role: deterministic extractor, not conversational • Inputs: transcript + minimal context + strict schema • Constraints: JSON-only, no markdown, no extra keys • Evidence requirement: every non-null field needs evidence span(s) • Unknown-safe: null/empty is correct when uncertain • Repair loop: if invalid JSON, retry with “repair to valid JSON matching schema; do not change meaning” Extraction prompt composition (required sections) 1. “You output JSON only” gate 2. Schema definition (field list + types) 3. Evidence rules (span indices or segment IDs) 4. Transcript + filename metadata 5. “If uncertain, set null and explain via confidence/evidence absence” Grouping prompt composition (required sections) 1. “You output JSON only” gate 2. Grouping schema definition 3. Candidate incidents summary (limited window): • last N incidents in last X minutes/hours in same jurisdiction/channel • include their normalized address, incident_id detected, time range, key terms 4. Current call extraction summary (from v2 extraction) 5. Conservative merge rules + threshold This keeps the model focused and prevents it from “free associating.” ⸻ 5) Candidate selection for grouping (non-AI logic) Before calling AI grouping, generate a small candidate set: • time window (e.g., last 60–180 minutes) • same jurisdiction or unknown jurisdiction allowed • same channel/talkgroup preferred • if address_normalized present: candidates with same street name or close token overlap • cap to N candidates (e.g., 20) AI grouping never searches the full DB. ⸻ 6) Incremental incident rollups (stability rules) Rollup updates must: • append a new rollup artifact per update (version history) • avoid rewriting past rollups unless explicitly repairing invalid output • tie each rollup to the list of call_ids included at that time Rollup content: • short factual summary • “latest update” bullets • key fields (address/jurisdiction/type/units involved) • confidence and “open questions” list (e.g., “location unclear”) ⸻ 7) Failure handling • Invalid JSON → retry repair (max 2–3 attempts) • Still invalid → mark stage failed, store raw output, require retry • Missing transcript → extraction stage fails fast with explicit error • Grouping with no candidates → decision=new_incident with moderate confidence unless incident_id explicitly exists ⸻ 8) Acceptance criteria • Extraction produces valid JSON v2 for ≥95% of calls (with repair loop allowed). • Fields with confidence >0.8 always have evidence spans. • False positive address/city invention rate approaches zero (measured on a small labeled set). • Grouping avoids aggressive merges: low-confidence merges go to requires_review=true. • Incident rollups stop thrashing: new call updates append a new rollup version; prior versions remain visible. ⸻ 9) Minimal test set you should add • 10–20 representative transcripts: • clear address • partial address • cross streets only • landmark only • no location • explicit incident ID • multiple calls referencing same event • two simultaneous events on same street (hard case) For each: • expected extraction fields + “unknowns” • expected grouping decision and confidence band ⸻"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Extract Metadata with Evidence (Priority: P1)

As an operator, I need each call to produce a strict, evidence-backed metadata
object that captures key incident fields while preserving unknowns.

**Why this priority**: Accurate extraction is the foundation for reliable
grouping, summaries, and notifications.

**Independent Test**: Run extraction on a transcript set covering clear
addresses, partial locations, and no-location calls; verify outputs are valid
JSON v2, evidence-backed, and unknown fields are null/empty.

**Acceptance Scenarios**:

1. **Given** a noisy transcript, **When** extraction runs, **Then** it stores a
   v2 JSON object with required fields, per-field confidence, and evidence.
2. **Given** a transcript with missing location details, **When** extraction
   runs, **Then** location-related fields are null/empty with low confidence.

---

### User Story 2 - Conservative Incident Grouping (Priority: P2)

As an operator, I need calls grouped into incidents using conservative,
explainable signals so unrelated calls are not merged.

**Why this priority**: Grouping errors create operational confusion and degrade
trust.

**Independent Test**: Run grouping on calls with explicit incident IDs, shared
addresses, and simultaneous events on the same street; verify correct decisions
and requires_review for low-confidence merges.

**Acceptance Scenarios**:

1. **Given** calls with an explicit incident ID match, **When** grouping runs,
   **Then** it joins the existing incident with evidence-backed confidence.
2. **Given** calls with weak or conflicting signals, **When** grouping runs,
   **Then** it prefers new incidents and sets requires_review to true.

---

### User Story 3 - Stable Incremental Rollups (Priority: P3)

As an operator, I need incident rollups to update incrementally without
thrashing prior summaries so history remains visible and trustworthy.

**Why this priority**: Stable rollups prevent confusion and preserve audit
history.

**Independent Test**: Add multiple related calls over time and confirm each
rollup appends a new version tied to the call set, with no overwriting.

**Acceptance Scenarios**:

1. **Given** a new call joins an incident, **When** the rollup updates, **Then**
   a new rollup artifact is appended with the included call IDs.
2. **Given** a prior rollup, **When** later calls arrive, **Then** past rollups
   remain visible and unchanged.

### Edge Cases

- Missing transcript or transcript segments.
- Conflicting or partial location references.
- No candidates available for grouping.
- Two simultaneous incidents on the same street.
- Invalid JSON returned by AI after repair attempts.

## Constitution Alignment *(mandatory)*

- **Local-first durability + idempotency**: v2 artifacts persist as new
  versions without overwriting prior data.
- **Deterministic call identity + read-only calls input**: No changes to call
  identity or ingestion behavior.
- **AI output schema + validation**: v2 schemas remain strict with repair
  retries and explicit failure recording.
- **Conservative grouping + incremental summaries**: Grouping rules are
  conservative and rollups append new versions.
- **Failure visibility + retry paths**: Failed extraction or grouping remains
  visible and retryable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate extraction output matching schema
  `extraction.v2` with required top-level fields.
- **FR-002**: Extraction MUST populate per-field confidence and evidence for
  every non-null field using transcript spans or segment references.
- **FR-003**: If evidence is missing, the corresponding field MUST be null/empty
  with low confidence.
- **FR-004**: Units, incident ID, and location fields MUST only be populated
  when explicitly supported by transcript or filename metadata evidence.
- **FR-005**: Grouping output MUST match schema `grouping.v2` with signals,
  confidence, explanation, and requires_review flag.
- **FR-006**: Grouping MUST be conservative; low-confidence merges set
  requires_review and default to new incidents unless explicit incident ID
  evidence is present.
- **FR-007**: Grouping MUST use a candidate set limited by time window and
  signal filters; the AI decision MUST not search the full incident history.
- **FR-008**: Rollup summaries MUST append new versions with included call IDs
  and must not overwrite prior rollups unless explicitly repairing invalid
  output.
- **FR-009**: Invalid JSON MUST trigger up to three total attempts (initial +
  repair retries); persistent invalid output MUST fail the stage and store raw
  output for review.
- **FR-010**: Missing transcripts MUST fail extraction fast with explicit
  errors and no downstream side effects.
- **FR-011**: Existing pipeline stages, persistence layout, and UI surfaces
  MUST remain compatible with v2 artifacts.
- **FR-012**: The system MUST include a minimal labeled transcript set for
  validating extraction and grouping behavior.

### Key Entities *(include if feature involves data)*

- **Extraction v2**: Versioned metadata object with confidence and evidence.
- **Evidence Item**: Transcript span or segment reference with justification.
- **Grouping Decision v2**: Decision object with signals and confidence.
- **Grouping Signal**: A weighted indicator used to justify grouping choices.
- **Rollup Artifact**: Versioned incident summary tied to included call IDs.
- **Candidate Set**: Limited list of incidents used for grouping evaluation.
- **Labeled Transcript Set**: Representative transcripts with expected outputs.

### Assumptions & Dependencies

- Transcripts are available in text form with optional segments/timestamps.
- Filename metadata has been normalized where available.
- Candidate window defaults to a 120-minute lookback and a maximum of 20
  candidates when not otherwise configured.
- Operator overrides are not part of this feature but should remain compatible
  with v2 outputs.

### Scope Boundaries

- No changes to core ingestion, persistence, or UI routes beyond compatibility.
- No new third-party integrations or external data sources.
- No new operator override UI in this scope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Extraction produces valid JSON v2 for at least 95% of calls,
  including repair retries.
- **SC-002**: 100% of fields with confidence > 0.8 include evidence spans or
  segment references.
- **SC-003**: False-positive address or city inventions are near zero on the
  labeled transcript set.
- **SC-004**: Grouping defaults to requires_review for low-confidence merges and
  avoids incorrect merges in test scenarios.
- **SC-005**: Rollups append new versions without overwriting prior versions in
  all multi-call incident tests.
