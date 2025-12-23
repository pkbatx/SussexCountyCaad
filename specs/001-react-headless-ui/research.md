# Research: Headless UI Frontend Migration

## Decision 1: Keep Vite and add React + Headless UI within the existing frontend
- **Decision**: Use the current Vite frontend and migrate to React with Headless UI components.
- **Rationale**: Minimizes disruption to build tooling while meeting the requirement for a React-based UI and headless UI patterns.
- **Alternatives considered**: Move to a different framework or a new app shell (rejected due to added migration risk and scope).

## Decision 2: Preserve hash-based navigation and URL semantics
- **Decision**: Keep hash routes (calls/incidents/notifications/detail views) to avoid server-side routing changes.
- **Rationale**: Maintains current deep-link behavior and avoids backend/static hosting changes.
- **Alternatives considered**: Browser history routing (rejected due to increased infrastructure changes and risk).

## Decision 3: Use React local state + context for UI state
- **Decision**: Manage filters, selection, and SSE status with React state and lightweight context/hooks.
- **Rationale**: Matches current single-page workflow without introducing new global state complexity.
- **Alternatives considered**: External state libraries (rejected to keep migration lightweight and predictable).

## Decision 4: Keep mapbox-gl integration and wrap with React lifecycle hooks
- **Decision**: Continue using mapbox-gl and adapt the existing map adapter to React effects.
- **Rationale**: Preserves existing map behavior, styles, and performance characteristics.
- **Alternatives considered**: Swap to a new map library (rejected due to functional parity risk).

## Decision 5: Maintain SSE + polling fallback behavior
- **Decision**: Keep the EventSource refresh channel with polling fallback when SSE is unavailable.
- **Rationale**: Preserves real-time updates and resilience in environments without SSE support.
- **Alternatives considered**: Poll-only (rejected due to regression in live updates).
