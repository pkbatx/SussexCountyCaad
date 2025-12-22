# Research

## Decision: Agency parsing source of truth
- Decision: Derive agency exclusively from filename tokens using deterministic rules; no AI inference.
- Rationale: Guarantees consistent, predictable agency labels for operators.
- Alternatives considered: AI-derived agency from transcript; mixed filename + transcript inference.

## Decision: Metadata exposure policy
- Decision: Operator-facing API responses omit confidence/evidence by default; allow debug-only access via explicit endpoint or flag.
- Rationale: Keeps UI clean and reduces the risk of misinterpreting model metadata as operational truth.
- Alternatives considered: Always include metadata; remove metadata entirely from API responses.

## Decision: Missing agency handling
- Decision: Render missing agency as "Unknown" and allow filtering on that value.
- Rationale: Keeps missing data visible and actionable without breaking filters.
- Alternatives considered: Hide missing agency; use "Unassigned".

## Decision: Grouping signal priority
- Decision: Incident type is a secondary grouping signal and never overrides agency + location matches.
- Rationale: Prevents unrelated merges while still using type as a weak signal.
- Alternatives considered: Remove incident type from grouping; allow type to override agency/location.

## Decision: Registry retention
- Decision: Retain unused agency registry entries for 30 days before cleanup.
- Rationale: Avoids churn while keeping the registry manageable.
- Alternatives considered: 7 days; 90 days.
