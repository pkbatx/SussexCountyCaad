<!--
Sync Impact Report
- Version change: unversioned template -> 1.0.0
- Modified principles:
  - Principle 1 placeholder -> Local-First Durability & Idempotent Pipeline
  - Principle 2 placeholder -> Immutable Inputs & Deterministic Call Identity
  - Principle 3 placeholder -> Provider-Abstraction with OpenAI Default
  - Principle 4 placeholder -> Strict Machine-Validated AI Output
  - Principle 5 placeholder -> Conservative Grouping & Incremental Summaries
- Added sections: None (template sections filled)
- Removed sections: None
- Templates requiring updates:
  - OK .specify/templates/plan-template.md
  - OK .specify/templates/spec-template.md
  - OK .specify/templates/tasks-template.md
  - PENDING .specify/templates/commands/*.md (directory missing)
- Follow-up TODOs:
  - TODO(RATIFICATION_DATE): confirm original ratification date
-->
# SussexCountyCAAD Constitution

## Core Principles

### Local-First Durability & Idempotent Pipeline
- All calls, tasks, artifacts, incident groups, summaries, locations, and
  notification logs MUST persist locally and survive restarts.
- The pipeline MUST be staged, idempotent, and safe to retry with deterministic
  results keyed by call identity.
- Failures MUST be recorded with actionable state and never hidden or silently
  skipped.
- Schema changes MUST use explicit migrations and record an audit trail of what
  produced each artifact and when.
Rationale: Local-first reliability requires durable state and safe retries.

### Immutable Inputs & Deterministic Call Identity
- The calls directory MUST be read-only input; no pipeline step may mutate it.
- Each audio file MUST map deterministically to a stable call identity derived
  from its content hash.
- Duplicate processing MUST be prevented; reprocessing is explicit and must
  remain idempotent.
Rationale: Deterministic identity prevents silent reprocessing and data drift.

### Provider-Abstraction with OpenAI Default
- AI calls MUST go through a clean internal provider interface; watcher,
  pipeline, database, and UI MUST NOT depend on provider-specific details.
- The MVP MUST use OpenAI endpoints out of the box and MUST run end-to-end
  without a local model runner.
- Provider swapping MUST NOT require changes outside the AI integration layer.
Rationale: The system stays testable now and extensible later.

### Strict Machine-Validated AI Output
- Metadata extraction and incident grouping outputs MUST be strict JSON matching
  defined schemas with no markdown or extra text.
- Responses MUST be machine-validated; invalid JSON is rejected and retried with
  a repair attempt.
- Each extracted field MUST include a confidence score and, when possible,
  evidence references back to transcript text.
- Transcripts are noisy; the system MUST preserve uncertainty and ambiguity
  rather than forcing a single answer.
- Location and geocoding are best-effort and MUST NOT fail the call when unclear.
Rationale: Reliable automation requires strict validation and explicit
uncertainty handling.

### Conservative Grouping & Incremental Summaries
- Incident grouping MUST be conservative and explainable: group by normalized
  address when available, otherwise by incident ID or strong matching signals.
- Low-confidence matches MUST NOT be merged; keep separate groups when uncertain.
- The system MUST maintain per-call history and artifacts while updating an
  incremental rollup summary for each incident group.
Rationale: Trustworthy grouping depends on cautious, explainable linkage.

## System Constraints & Configuration

- The system MUST run end-to-end locally; AI calls are the only external
  dependency for MVP behavior.
- Configuration MUST live outside code (env/config files); secrets are never
  committed.
- Default configuration MUST enable OpenAI testing with minimal setup.
- The UI MUST make processing state, failures, and retry paths obvious.
- Local operation MUST be straightforward and documented.

## Workflow & Quality Gates

- If requirements are ambiguous, stop and ask rather than guessing.
- No opportunistic refactors, unrelated formatting changes, or scope expansion;
  every change MUST trace to a stated requirement and concrete task.
- Changes affecting ingestion, schema/migrations, grouping logic, or
  notification delivery MUST include explicit validation.
- AI schema or prompt changes MUST update validation and repair-retry handling.
- Operational changes MUST preserve failure visibility and retry clarity.

## Governance

- This constitution supersedes other project documentation; resolve conflicts by
  updating docs or amending this constitution.
- Amendments require a documented proposal, an updated Sync Impact Report,
  semver version bump, and updates to dependent templates and guidance, with
  approval from the project owner.
- Versioning policy: MAJOR for incompatible governance or principle
  removals/redefinitions; MINOR for new principles/sections or material
  expansions; PATCH for clarifications or typo fixes.
- Compliance review is required for every change; deviations need explicit
  justification and approval.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): confirm original ratification date | **Last Amended**: 2025-12-20
