# Research: Incident-Centric Cohesion UI

## Decision: Incident-first layout with call drill-down
**Rationale**: Reduces cognitive load and eliminates competing top-level views.
**Alternatives considered**: Keep calls as a parallel top-level list (rejected
because it conflicts with incident-first operations and causes confusion).

## Decision: Incident-level digest aggregation in backend summary feed
**Rationale**: Ensures one summary per incident per window, consistent across
clients, and avoids client-side rollups.
**Alternatives considered**: Aggregate per incident in the UI (rejected because
it violates incident-first backend sourcing and increases UI complexity).

## Decision: Confidence tiers and review labels replace raw weights
**Rationale**: Operators need clear signals without internal scoring details.
**Alternatives considered**: Show numeric weights and formula breakdowns
(rejected as developer-only and confusing).

## Decision: Call progression states derived from existing pipeline stages
**Rationale**: Shows transcription/analyzing/pending incident without blocking
ingestion or changing core records.
**Alternatives considered**: Add new schema fields or pipeline stages (rejected
as unnecessary for UI cohesion and higher risk).

## Decision: 24-hour clock with seconds in header
**Rationale**: Provides realtime perception and timing accuracy during active
monitoring.
**Alternatives considered**: Minute-only clock (rejected as insufficiently
realtime).

## Decision: Audio player UI refresh without API changes
**Rationale**: Improves clarity while preserving existing audio sources and
workflows.
**Alternatives considered**: Replace audio pipeline or require new endpoints
(rejected as out of scope).
