# Phase 0 Research: Extraction & Grouping Accuracy v2

## Decisions

### Decision: Adopt extraction.v2 schema with evidence-backed fields
**Rationale**: Evidence and per-field confidence reduce hallucination risk and
improve trust in noisy transcripts.
**Alternatives considered**:
- Continue with unstructured extraction payloads (rejected: hard to validate).
- Require evidence only for select fields (rejected: inconsistent quality).

### Decision: Use grouping.v2 schema with explicit signals and review flag
**Rationale**: Structured signals make grouping explainable and help prevent
aggressive merges.
**Alternatives considered**:
- Use a single free-form explanation string (rejected: not machine-checkable).
- Merge by address only (rejected: weak for ambiguous locations).

### Decision: Candidate selection uses time window + signal filters
**Rationale**: Limits AI context and improves performance without scanning all
incidents.
**Alternatives considered**:
- Full incident history search (rejected: expensive and error-prone).
- Address-only candidate filter (rejected: weak when address unknown).

### Decision: Repair loop is capped at three total attempts
**Rationale**: Balances resilience with clear failure visibility and avoids
infinite retries.
**Alternatives considered**:
- Unlimited retries (rejected: hides failures and wastes resources).
- Single attempt only (rejected: too brittle for model output variability).

### Decision: Rollups are append-only with version history
**Rationale**: Preserves audit history and prevents summary thrash.
**Alternatives considered**:
- Overwrite rollup in place (rejected: loses history).
- Store only latest rollup (rejected: not auditable).

### Decision: Add labeled transcript fixtures for regression checks
**Rationale**: Enables repeatable evaluation of extraction and grouping quality.
**Alternatives considered**:
- Manual ad hoc checks only (rejected: non-repeatable and subjective).
