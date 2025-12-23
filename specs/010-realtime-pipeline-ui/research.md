# Research: Realtime Pipeline & UI Updates

## Decision 1: Realtime updates via SSE with incremental payloads

**Decision**: Extend the existing SSE stream to emit typed events with minimal payloads (IDs, timestamps, small field deltas).

**Rationale**: SSE is already in use and provides a low-dependency, local-first way to push realtime updates without polling.

**Alternatives considered**: Client polling at intervals (rejected due to latency and wasted queries).

## Decision 2: Transcript-grounded summary updates triggered by transcript changes

**Decision**: Update incident summaries only when transcript content changes, and keep summary versions in history.

**Rationale**: Ensures summaries are grounded in actual dispatcher language and avoids reprocessing when nothing changes.

**Alternatives considered**: Fixed-interval summary refreshes (rejected for unnecessary work and stale detail).

## Decision 3: Lifecycle state transitions based on activity timing

**Decision**: Compute lifecycle state from the latest transcript or call activity timestamps, targeting a ~20-minute total window.

**Rationale**: Aligns with operational expectations while remaining deterministic and configurable.

**Alternatives considered**: Manual lifecycle updates (rejected for non-realtime behavior).

## Decision 4: Server-side filtering and aggregates

**Decision**: Implement filtering and aggregates in the API layer with indexed queries, not in the frontend.

**Rationale**: Keeps UI lightweight and ensures consistent, fast pivots across agencies/towns/types/status.

**Alternatives considered**: Client-side joins and filtering (rejected for performance and correctness).
