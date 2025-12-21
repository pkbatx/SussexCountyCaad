# Research

## Decision: Map provider and layering
- Decision: Use Leaflet with OpenStreetMap tiles for the MVP basemap, plus Leaflet.heat for heatmaps and Leaflet.markercluster for clustering.
- Rationale: Dependencies are already present, lightweight, and match the non-heavy UI constraint while keeping the map provider swappable.
- Alternatives considered: Mapbox GL JS heatmap layer (requires token-based basemap); heatmap.js overlay (more setup and weight tuning).

## Decision: Heatmap intensity basis
- Decision: Combined recency-weighted volume (weight increases for newer calls within the filter window).
- Rationale: Matches the clarified requirement and improves situational awareness for recent activity without hiding aggregate volume.
- Alternatives considered: Pure volume weighting; recency-only weighting.

## Decision: Update strategy
- Decision: Lightweight polling on a fixed interval with cached detail fetches and filter-driven refreshes.
- Rationale: Keeps the UI responsive without introducing heavy realtime infrastructure; aligns with local-first constraints.
- Alternatives considered: WebSocket push (higher complexity); full page reloads (disruptive).

## Decision: Sussex County framing
- Decision: Default map view uses a fixed Sussex County bounds/center constant in the UI config.
- Rationale: Operators need consistent framing; reduces map startup variance.
- Alternatives considered: Dynamic fit to current data extent only.
