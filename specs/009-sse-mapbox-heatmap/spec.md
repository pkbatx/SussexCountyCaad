# Feature Specification: SSE + Mapbox Heatmap

**Feature Branch**: `009-sse-mapbox-heatmap`  
**Created**: 2025-12-22  
**Status**: Draft  
**Input**: User description: "Please upgrade the backened to use SSE events, and use a dark mode mapbox web app heat map instead of leaflet integrating the bounding box to Sussex County overview. Additionally, the map refreshes every few seconds which makes it difficult to use since it recenters on refresh we need to figure that out"

## Clarifications

### Session 2025-12-22

- Q: What should SSE events contain? → A: Lightweight refresh events only; UI refetches existing endpoints.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Updates Without Disruption (Priority: P1)

Operators see live updates without losing their current view or context.

**Why this priority**: Live updates are essential to operational awareness; recentering breaks usability.

**Independent Test**: Can be tested by generating updates and confirming UI refreshes without map recentering.

**Acceptance Scenarios**:

1. **Given** the UI is open and connected, **When** new calls/incidents arrive, **Then** lists and summary update without a page reload.
2. **Given** the map has been panned/zoomed, **When** updates arrive, **Then** the map view stays fixed and does not recenter.
3. **Given** the SSE connection drops, **When** the UI detects it, **Then** the UI shows connection status and continues displaying the last known data.

---

### User Story 2 - Dark Mapbox Heatmap Context (Priority: P2)

Operators get a dark, reliable map context with heatmap and markers focused on Sussex County.

**Why this priority**: A stable, dark operational map improves spatial awareness without distracting from incident work.

**Independent Test**: Can be tested by loading the map with Sussex bounding box and switching modes.

**Acceptance Scenarios**:

1. **Given** the map loads, **When** the view initializes, **Then** it frames Sussex County with a dark basemap.
2. **Given** map points exist, **When** the operator toggles heatmap or markers, **Then** the map updates without re-centering.

### Edge Cases

- SSE connection drops or reconnects while the UI is open.
- Mapbox token missing or invalid.
- No valid coordinates are available for current filters.

## Constitution Alignment *(mandatory)*

- **Local-first durability + idempotency**: No change to storage or ingestion; SSE is read-only and local.
- **Deterministic call identity + read-only calls input**: No impact; call identity remains unchanged.
- **AI output schema + validation**: No change to schemas or validation behavior.
- **Conservative grouping + incremental summaries**: No change to grouping rules or rollups.
- **Failure visibility + retry paths**: SSE connection state is visible; UI continues to show last known data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Backend MUST expose a Server-Sent Events (SSE) endpoint for live updates.
- **FR-002**: SSE MUST emit lightweight refresh events; it MUST NOT send full payloads.
- **FR-003**: UI MUST subscribe to SSE and refetch calls, incidents, summary, and map points without a full page reload.
- **FR-004**: UI MUST preserve user-selected map view (center/zoom) across updates; only initial load sets Sussex bounds.
- **FR-005**: Map MUST use a dark Mapbox basemap with heatmap and marker modes.
- **FR-006**: Map MUST default to the Sussex County bounding box and allow normal pan/zoom interactions.
- **FR-007**: UI MUST present SSE connection status and retain the last known data when disconnected.

### Key Entities *(include if feature involves data)*

- **SSE Event**: A lightweight refresh signal used to trigger refetches.
- **Map View State**: Current center, zoom, and bounding box used to preserve user context.
- **Map Point**: Coordinate with associated call/incident identity for markers or heatmap density.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of updates appear in the UI within 3 seconds of emission.
- **SC-002**: Map view remains unchanged across at least 50 consecutive updates.
- **SC-003**: Dark map context loads within 5 seconds on initial load.
- **SC-004**: Heatmap/marker toggle updates the map within 1 second.
