# Research: Incident-Centric Stability

## Decision 1: Append-only rollup history

**Decision**: Store incident rollups as append-only versions, never overwriting prior
summaries.

**Rationale**: Preserves incident evolution and prevents summary thrash while keeping
an audit trail for operators.

**Alternatives considered**: Overwrite a single rollup record; store only latest
summary.

## Decision 2: Conservative grouping with explicit review flags

**Decision**: Require explicit confidence thresholds for auto-merge and mark low-
confidence decisions as needing attention.

**Rationale**: Reduces incorrect merges and keeps grouping decisions explainable and
actionable.

**Alternatives considered**: Merge by time proximity alone; always merge on partial
address match.

## Decision 3: Bounded feedback adjustments (no model tuning)

**Decision**: Record contradiction-based feedback signals and apply bounded
adjustments to thresholds or pattern confidence locally.

**Rationale**: Improves behavior over time with an auditable trail without changing
providers or retraining models.

**Alternatives considered**: External model fine-tuning; manual-only correction with
no behavior adjustment.

## Decision 4: Optional local reference data grounding

**Decision**: Use local street/town/POI reference candidates when available to
prefer known values, but remain functional when absent.

**Rationale**: Improves extraction consistency without blocking processing on missing
reference data.

**Alternatives considered**: Hard dependency on reference tables; freeform extraction
without candidate grounding.
