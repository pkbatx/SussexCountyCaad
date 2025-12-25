# Research: Incident Timeline Console

## Waveform Rendering

**Decision**: Use WaveSurfer.js for waveform rendering with HTML5 audio as the source.
**Rationale**: Provides a reliable waveform UI, supports seek events, and integrates with existing audio playback without a bespoke rendering pipeline.
**Alternatives considered**: Custom canvas waveform using Web Audio API (rejected due to longer implementation time and higher maintenance cost).

## Timeline Aggregation Strategy

**Decision**: Build a backend aggregation layer that produces a single ordered timeline from dispatch actions, calls, audio/transcript segments, and system insights.
**Rationale**: Keeps ordering consistent, enables stable pagination, and allows UI to remain focused on rendering without recomputation.
**Alternatives considered**: Frontend-only merging of disparate lists (rejected due to inconsistent ordering and duplicated logic).

## Summary Evidence Linking

**Decision**: Store summary evidence links as references to transcript segments and audio time ranges per statement.
**Rationale**: Enables auditability and supports direct jump from summary to source evidence.
**Alternatives considered**: Free-text summary without evidence links (rejected due to audit requirements).
