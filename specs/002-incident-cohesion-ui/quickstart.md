# Quickstart: Incident-Centric Cohesion UI

## Manual Validation Checklist

1. **Incident-first landing**
   - Open the UI and confirm incidents are the primary list.
   - Confirm there is no competing top-level call list view.

2. **24-hour seconds clock**
   - Verify the header clock uses HH:MM:SS (24-hour) format.
   - Observe the clock ticking every second for at least 60 seconds.

3. **Summary clarity**
   - Check that summary metrics are labeled with their basis (incidents vs calls)
     and time window.
   - Confirm no ambiguous call vs incident counts are displayed.

4. **Call progression and pending incidents**
   - Ingest a new call and confirm a pending incident item appears with a clear
     progress state.
   - Confirm the call transitions into the incident drill-down list once grouped.

5. **Incident drill-down**
   - Open an incident and drill into a related call without losing filter
     context.

6. **Incident digest aggregation**
   - Verify the incident digest shows one entry per incident (no per-call
     duplicates) within the time window.

7. **Rollup history readability**
   - Confirm rollup history entries are deduplicated and human-readable.
   - Verify no internal scoring details or numeric weights are shown.

8. **Confidence signals**
   - Confirm confidence is displayed as High/Medium/Low with review status.

9. **Audio player polish**
   - Play a call audio track and verify the player shows track context, progress,
     and clear controls in the updated UI.
