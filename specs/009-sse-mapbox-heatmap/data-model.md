# Data Model: SSE + Mapbox Heatmap

## Overview
No new persistent database schema is required for this feature. The changes are
limited to transport (SSE) and UI state management using existing API data.

## Entities

### SSE Event
- **type**: string (fixed: `refresh`)
- **emitted_at**: ISO-8601 timestamp

### Map View State (UI)
- **center_lat**: number
- **center_lng**: number
- **zoom**: number
- **bounds**: { west, south, east, north } (optional)

### Map Point
- **id**: string (call_id or incident_id)
- **kind**: `call` | `incident`
- **latitude**: number
- **longitude**: number
- **updated_at**: ISO-8601 timestamp
- **weight**: number (optional; used for heatmap intensity)

### SSE Connection State (UI)
- **status**: `connecting` | `connected` | `disconnected`
- **last_event_at**: ISO-8601 timestamp (optional)

## Validation Rules
- SSE events are refresh-only; payloads remain minimal.
- Map points require valid coordinates before rendering.
- Map view state persists across refreshes; bounds are only applied on initial
  load.
