# Validation Checklist: SussexCountyCAAD Core Workflow

**Purpose**: Validate ingestion, grouping, and notification behavior
**Created**: 2025-12-20
**Feature**: ../spec.md

## Ingestion

- [ ] New file creates a call with stable ID and status
- [ ] Duplicate file does not create a second call
- [ ] Calls persist after restart

## AI Outputs

- [ ] Transcription stored with stage status updates
- [ ] Metadata extraction JSON validates against schema
- [ ] Invalid JSON triggers repair retry and logs failure

## Grouping & Summaries

- [ ] Grouping only merges with strong signals
- [ ] Incident rollup summary updates without overwriting history
- [ ] Geo stage stores raw location text when available

## Notifications

- [ ] Notifications dedupe within rate-limit window
- [ ] Delivery failures recorded with error detail
- [ ] Notification history visible in UI
