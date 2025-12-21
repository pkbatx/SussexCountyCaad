# Feature Specification: Operational Map UI

**Feature Branch**: `005-add-ops-map-ui`  
**Created**: 2025-12-20  
**Status**: Draft  
**Input**: User description: "I want a product-ready UI for SussexCountyCAAD. It must be dark mode by default with a modern neutral palette (charcoal/slate surfaces, subtle borders, muted accent colors) and no blue-dominant background. The UI should feel organized, information-dense, and operational, not consumer app. The UI must include a map view focused on Sussex County, NJ that can plot calls and incidents and provide a heat map view of call density. The heat map must be driven from call/incident coordinates and should support intensity by recency and/or call volume. The map integration must be stable and lightweight. For MVP of this feature, implement heatmap using a proven approach like a Leaflet heatmap layer (Leaflet.heat or heatmap.js overlay), or a Mapbox GL JS heatmap layer if we choose a token-based basemap. Keep the choice behind a small abstraction so we can swap providers later without rewriting the UI. The map must support pan/zoom, clustering at low zoom, and toggles between point markers and heat map. The default view should frame Sussex County, NJ, and the UI should provide quick filters that immediately reflect on both the list and the map: time window, incident type, jurisdiction/town, status (active/resolved), and confidence threshold for grouping. The UI must provide real operational insights, not just a list. At minimum it should include: a calls feed with fast filtering and clear status badges, an incidents feed with rollups and last-update timestamps, and a detail view that shows transcript, extracted metadata, grouping rationale, and rollup history. Add a dashboard-style summary strip at the top with key counts for the selected time window (total calls, active incidents, high-priority calls, failed stages, notifications sent). Provide a simple trend visualization (calls over time) and top hotspots (top towns/streets/POIs by count) for the current filter context. The UI must be responsive and usable on mobile and desktop. Layout should be structured: left column for filters + lists, main area for map + detail panels, with clear separation of concerns and consistent spacing/typography. No visual noise: no gradients, no heavy shadows, no neon. Use subtle elevation and borders. The UI must integrate with the existing backend API. It should load data efficiently (pagination/infinite scroll for feeds, cached detail fetches) and remain responsive during updates. The UI should support realtime-ish updates through polling or light refresh without requiring full page reload. Finally, this UI should include a feedback entry path that’s fast and frictionless: from a call or incident detail view, allow a user to submit small feedback signals (wrong location, wrong incident grouping, wrong type) and immediately reflect that feedback in the UI state while it queues backend reprocessing. Feedback should not require admin workflows; it should be minimal and operational. No changes to core ingestion or storage are part of this feature except what is needed to support the UI’s map rendering, heatmap aggregation, and feedback submission."

## Clarifications

### Session 2025-12-21

- Q: Heatmap intensity basis? → A: Combined recency-weighted volume.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operational console with map + feedback (Priority: P1)

Operators use a dark, information-dense console to filter calls/incidents, view
map context, and submit rapid feedback from detail views without breaking their
workflow.

**Why this priority**: This is the primary operational workflow and the minimum
usable interface for day-to-day monitoring.

**Independent Test**: Apply filters, open a call/incident detail, submit a
feedback signal, and confirm list/map updates reflect the change.

**Acceptance Scenarios**:

1. **Given** calls and incidents within the selected time window, **When** an
   operator applies filters, **Then** the feeds and map update in sync and show
   only matching items.
2. **Given** a call or incident detail view, **When** an operator submits
   feedback (wrong location/type/grouping), **Then** the UI shows the feedback
   immediately and indicates that reprocessing is queued.

---

### User Story 2 - Heatmap + clustering + operational insights (Priority: P2)

Operators can switch between clustered markers and a heatmap that reflects
combined recency-weighted call volume, and see summary metrics, trends, and
hotspots for the active filters.

**Why this priority**: Provides the situational awareness and trend detection
needed for dispatch operations.

**Independent Test**: Toggle between markers and heatmap, confirm the visual
intensity and summary metrics change with time-window filters.

**Acceptance Scenarios**:

1. **Given** a broad time window, **When** the operator enables heatmap mode,
   **Then** intensity reflects combined recency-weighted call density and the
   map remains responsive.
2. **Given** a filtered subset, **When** the operator views summary metrics and
   hotspots, **Then** counts and top locations match the filter context.

---

### User Story 3 - Responsive layout + realtime-ish updates (Priority: P3)

Operators can use the UI on mobile or desktop with a stable layout and receive
lightweight updates without full reloads.

**Why this priority**: The UI must remain usable across devices and stay
current without disruption.

**Independent Test**: Resize to mobile view, confirm layout stability, and
verify updates appear within the refresh interval without a full page reload.

**Acceptance Scenarios**:

1. **Given** a narrow viewport, **When** the operator navigates feeds and
   details, **Then** the layout remains readable and functional without
   horizontal scrolling.
2. **Given** new calls arrive, **When** the refresh interval triggers, **Then**
   the UI updates lists/map without losing the current view state.

---

### Edge Cases

- What happens when no items match the filter set (empty feeds and map)?
- How does the UI behave when items lack coordinates (map and heatmap gaps)?
- What happens when the map provider is unavailable or slow to load?
- How does the UI handle very large time windows with high item counts?
- What happens when feedback submission fails or the backend is offline?

## Constitution Alignment *(mandatory)*

- **Local-first durability + idempotency**: UI changes are read-only on core
  ingestion data and do not alter local persistence semantics.
- **Deterministic call identity + read-only calls input**: The UI consumes
  call/incident identifiers without mutating the calls directory.
- **AI output schema + validation**: UI displays AI artifacts and feedback
  status without changing schema rules.
- **Conservative grouping + incremental summaries**: UI surfaces grouping
  rationale and rollup history without changing grouping logic.
- **Failure visibility + retry paths**: Feedback failures and reprocess status
  are visible and actionable in the UI.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: UI MUST default to dark mode with a neutral operational palette
  and avoid blue-dominant backgrounds.
- **FR-002**: UI MUST provide a map view centered on Sussex County, NJ with
  pan/zoom, clustering at low zoom, and toggles between markers and heatmap.
- **FR-003**: Heatmap intensity MUST reflect combined recency-weighted volume
  and reflect the active filter context.
- **FR-004**: UI MUST provide synchronized filters for time window, incident
  type, jurisdiction/town, status, and grouping confidence threshold that
  update both lists and map.
- **FR-005**: UI MUST include calls and incidents feeds with status badges,
  rollups, and last-update timestamps.
- **FR-006**: UI MUST provide a detail view that includes transcript,
  extracted metadata, grouping rationale, and rollup history.
- **FR-007**: UI MUST include a summary strip with key counts for the active
  time window and a trend view of calls over time.
- **FR-008**: UI MUST show top hotspots (towns/streets/POIs) based on the
  current filters.
- **FR-009**: UI MUST support fast, frictionless feedback submission from
  call or incident detail views and reflect queued reprocessing state.
- **FR-010**: UI MUST load data efficiently with pagination for feeds and
  cached detail retrieval within a session.
- **FR-011**: UI MUST provide realtime-ish updates via lightweight refresh
  without a full page reload.
- **FR-012**: UI MUST remain usable on mobile and desktop with consistent
  spacing and clear layout separation.
- **FR-013**: UI MUST not require changes to ingestion or storage beyond
  supporting map rendering, heatmap aggregation, and feedback submission.

### Key Entities *(include if feature involves data)*

- **Map Overlay**: Visual representation of calls/incidents as markers or
  heatmap layers.
- **Filter Set**: Active query parameters that drive feeds, map, and summaries.
- **Summary Metrics**: Aggregated counts for the current time window and
  filters (calls, incidents, priority, failures, notifications).
- **Trend Series**: Time-bucketed call counts for the active filter context.
- **Hotspot Aggregate**: Top towns/streets/POIs by count for the active filters.

### Assumptions & Dependencies

- Backend APIs expose coordinates for calls/incidents or return clear indicators
  when coordinates are unavailable.
- Backend APIs support feed pagination and return enough metadata to render
  status badges, rollups, and grouping rationale.
- Map tiles and basemap assets are accessible in the local environment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Filter changes update both feeds and map within 1 second in local
  operation for up to 500 recent calls.
- **SC-002**: Heatmap/marker toggle responds within 1 second without losing the
  current viewport.
- **SC-003**: Summary metrics and trend data reflect the active filters with no
  more than 1 refresh interval of staleness.
- **SC-004**: 95% of feedback submissions are visible in the UI within 2
  seconds and show queued reprocessing status.
