# Data Model

## Entities

### Agency Registry
- Fields: agency_id, canonical_name, service_type (FD|EMS|FM), aliases (raw tokens),
  last_seen_at, created_at, updated_at.
- Relationships: referenced by Calls and Incidents for display/filtering.
- Validation: canonical_name required; service_type required when known; aliases unique per canonical entry.

### Call (Operator View)
- Fields: call_id, agency, incident_type, address, town, cross_street, poi, summary,
  status, first_seen_at.
- Relationships: belongs to an Incident; derived from normalized extraction output.
- Validation: agency may be null/Unknown; location fields nullable.

### Incident (Operator View)
- Fields: incident_id, agency, incident_type, address, town, cross_street, summary,
  status, last_updated_at, member_count.
- Relationships: aggregates Calls; rollup summary uses normalized fields.
- Validation: agency may be null/Unknown; status derived from rollup/state.

### Normalized Extraction Output
- Fields: agency, incident_type, address, town, cross_street, poi, summary.
- Relationships: used to populate Call/Incident operator views.
- Validation: fields are present with concrete values or null; no confidence metadata surfaced in UI.

### Grouping Decision (Internal)
- Fields: call_id, incident_id, decision, signals (agency/location/type), created_at.
- Relationships: used to maintain incident membership.
- Validation: incident type is secondary and never overrides agency + location matches.

## State Transitions (Operator View)
- Call status: pending -> processing -> completed | failed | duplicate.
- Incident status: derived from rollup summaries (active/resolved).
- Agency registry: last_seen_at updated when new call is parsed.
