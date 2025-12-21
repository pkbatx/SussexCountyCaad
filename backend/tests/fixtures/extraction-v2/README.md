Extraction v2 fixtures

Each fixture uses two files:
- *.txt: transcript text used for extraction.
- *.json: expected extraction.v2 payload for schema and evidence validation.

Evidence requirements:
- Non-null fields must include evidence items with transcript spans.
- Evidence spans use start_char/end_char offsets into the transcript text.

Naming convention:
- <case>.txt and <case>.json share the same base name.
