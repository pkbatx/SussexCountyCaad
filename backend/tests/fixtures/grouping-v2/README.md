Grouping v2 fixtures

Each fixture uses two files:
- *.json: expected grouping.v2 payload to validate schema and signals.
- *.meta.json: candidate context and input summary for reference.

Evidence requirements:
- Signal evidence is optional but must use the EvidenceItem shape if present.

Naming convention:
- <case>.json and <case>.meta.json share the same base name.
