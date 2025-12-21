# Quickstart: Incident-Centric Stability

## Scenario 1: Incident rollup history

1. Start backend and frontend.
2. Drop multiple call audio files referencing the same incident into the calls
   directory.
3. Open the incident feed and confirm a single incident entry with a stable
   identifier.
4. Open incident detail and verify multiple rollup versions are present and
   appended over time.

## Scenario 2: Conservative grouping and review flags

1. Provide two calls that are close in time but refer to different incidents on
   the same street.
2. Confirm the system creates separate incidents and marks low-confidence
   grouping decisions as needing attention.

## Scenario 3: Grounded extraction with unknowns

1. Provide one transcript with a clear reference candidate match and another with
   ambiguous location.
2. Verify evidence spans exist for populated fields and ambiguous fields remain
   unknown with low confidence.

## Scenario 4: Incident-aware notifications

1. Trigger a new incident and confirm a single notification is logged.
2. Add a follow-up call with no material change and confirm notification
   suppression is logged.
3. Add a significant change (e.g., priority change) and confirm a new incident
   update notification is logged.

## Scenario 5: Feedback and correction signals

1. Process an incident with a clear address in the rollup.
2. Ingest a follow-up call for the same incident with a conflicting address.
3. Confirm a feedback signal is recorded and subsequent extraction confidence is
   reduced for the contradicted fields.

## Validation results

- Scenario 1: Not run (manual validation required).
- Scenario 2: Not run (manual validation required).
- Scenario 3: Not run (manual validation required).
- Scenario 4: Not run (manual validation required).
- Scenario 5: Not run (manual validation required).
