# Phase 0 Research: SSE + Mapbox Heatmap

## Decision: SSE refresh-only events
- **Decision**: Emit lightweight refresh events only (no payload), UI refetches
  existing endpoints.
- **Rationale**: Minimizes bandwidth, avoids duplicating payload schemas, and
  aligns with the clarification to keep SSE as a refresh signal only.
- **Alternatives considered**: Send full payloads over SSE; use polling only.

## Decision: Mapbox GL JS dark basemap with heatmap + markers
- **Decision**: Use Mapbox GL JS with a dark style and support heatmap/marker
  modes.
- **Rationale**: Required by spec, supports heatmap natively, and simplifies
  theming in a single map stack.
- **Alternatives considered**: Continue Leaflet + Leaflet.heat; Mapbox raster
  tiles inside Leaflet.

## Decision: Preserve map view across updates
- **Decision**: Persist map view state in UI and only fit bounds on initial load.
- **Rationale**: Prevents recentering on refresh and preserves operator context.
- **Alternatives considered**: Re-fit bounds on every refresh; reset to default
  view on updates.

## Decision: Surface SSE connection status in UI
- **Decision**: Show connected/disconnected state and keep last known data.
- **Rationale**: Required for failure visibility without interrupting workflows.
- **Alternatives considered**: Silent reconnection without status indicator.
