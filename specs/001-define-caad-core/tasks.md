---

description: "Task list for SussexCountyCAAD core workflow implementation"
---

# Tasks: SussexCountyCAAD Core Workflow

**Input**: Design documents from `/specs/001-define-caad-core/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests/Validation**: Validation tasks are REQUIRED when changes touch ingestion, schema/migrations, grouping logic, or notifications. Other tests are optional unless explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project directories at `backend/` and `frontend/`
- [x] T002 [P] Initialize backend Node project in `backend/package.json` with minimal scripts
- [x] T003 [P] Initialize frontend Vite project in `frontend/package.json`, `frontend/vite.config.js`, and `frontend/index.html`
- [x] T004 Add root run scripts in `package.json` for `dev:backend` and `dev:frontend`
- [x] T005 Add backend entrypoint skeleton in `backend/src/index.js` to wire config, DB, API, pipeline, and watcher

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 [P] Implement env parsing and defaults in `backend/src/config/env.js` and sample in `.env.example`
- [x] T007 [P] Implement SQLite connection helper in `backend/src/db/connection.js`
- [x] T008 Implement migration runner in `backend/src/db/migrate.js` and initial schema in `backend/src/db/migrations/001_init.sql`
- [x] T009 Implement base repositories for calls and stages in `backend/src/db/queries/calls.js` and `backend/src/db/queries/stages.js`
- [x] T010 Implement pipeline runner and stage registry in `backend/src/pipeline/runner.js` and `backend/src/pipeline/stages/index.js`
- [x] T011 Implement AI adapter interface in `backend/src/ai/adapter.js`
- [x] T012 Implement local API server and health handler in `backend/src/api/server.js` and `backend/src/api/handlers/health.js`
- [x] T013 Implement UI shell and base layout in `frontend/src/main.js`, `frontend/src/views/layout.js`, and `frontend/src/styles.css`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Process Calls End-to-End (Priority: P1) 🎯 MVP

**Goal**: Ingest read-only audio files, create deterministic calls, run transcription and call summaries, and surface status, errors, and retries in the UI.

**Independent Test**: Drop a new audio file into the calls folder and verify a call appears with stable ID, stage status, transcript, summary, and retry controls after restart.

### Implementation for User Story 1

- [x] T014 [P] [US1] Implement content hashing utility in `backend/src/ingest/hash.js`
- [x] T015 [US1] Implement file watcher and ingestion pipeline in `backend/src/ingest/watcher.js` and `backend/src/ingest/ingest.js`
- [x] T016 [US1] Add ingestion idempotency validation in `backend/src/ingest/validate.js`
- [x] T017 [US1] Implement stage run tracking and status updates in `backend/src/pipeline/stage-runner.js`
- [x] T018 [US1] Implement OpenAI client and transcription stage in `backend/src/ai/openai.js` and `backend/src/pipeline/stages/transcription.js`
- [x] T019 [US1] Persist transcripts and AI invocations in `backend/src/db/queries/transcripts.js` and `backend/src/db/queries/ai_invocations.js`
- [x] T020 [US1] Implement per-call summary stage in `backend/src/pipeline/stages/call-summary.js` and storage in `backend/src/db/queries/summaries.js`
- [x] T021 [US1] Implement calls API handlers and retry endpoint in `backend/src/api/handlers/calls.js` (wire in `backend/src/api/server.js`)
- [x] T022 [P] [US1] Implement frontend API client in `frontend/src/api.js`
- [x] T023 [P] [US1] Build calls feed view with status and retry controls in `frontend/src/views/calls.js`
- [x] T024 [P] [US1] Build call detail view with transcript, summary, and stage history in `frontend/src/views/call-detail.js`

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Structured Metadata & Incident Grouping (Priority: P2)

**Goal**: Produce strict JSON metadata, conservatively group incidents, and maintain rollup summaries with best-effort geo.

**Independent Test**: Process related and ambiguous calls; confirm validated JSON with confidence and evidence, conservative grouping, and rollup summaries without overwriting history.

### Implementation for User Story 2

- [x] T025 [P] [US2] Define metadata and grouping schemas in `backend/src/ai/schema/metadata.json` and `backend/src/ai/schema/grouping.json`
- [x] T026 [US2] Implement schema validation and repair retry in `backend/src/ai/validate.js` and `backend/src/ai/repair.js`
- [x] T027 [US2] Implement metadata extraction stage in `backend/src/pipeline/stages/extraction.js` and storage in `backend/src/db/queries/metadata.js`
- [x] T028 [US2] Implement conservative grouping policy in `backend/src/pipeline/grouping-policy.js`
- [x] T029 [US2] Implement incident grouping stage in `backend/src/pipeline/stages/grouping.js` and persistence in `backend/src/db/queries/incidents.js`
- [x] T030 [US2] Implement incident rollup summaries in `backend/src/pipeline/stages/incident-summary.js`
- [x] T031 [US2] Implement best-effort geo stage and storage in `backend/src/pipeline/stages/geo.js` and `backend/src/db/queries/locations.js`
- [x] T032 [US2] Implement incidents API handlers in `backend/src/api/handlers/incidents.js` (wire in `backend/src/api/server.js`)
- [x] T033 [P] [US2] Add metadata section to call detail UI in `frontend/src/views/call-detail.js`
- [x] T034 [P] [US2] Build incidents feed view in `frontend/src/views/incidents.js`
- [x] T035 [P] [US2] Build incident detail view in `frontend/src/views/incident-detail.js`

**Checkpoint**: User Stories 1 and 2 should work independently

---

## Phase 5: User Story 3 - Notifications & Routing (Priority: P3)

**Goal**: Deliver deduplicated, rate-limited notifications to GroupMe and Discord with visible delivery history.

**Independent Test**: Configure routing rules and process matching calls; verify single notifications per window, recorded history, and failures surfaced.

### Implementation for User Story 3

- [x] T036 [US3] Define notification routing rules in `backend/src/notifications/rules.js`
- [x] T037 [US3] Implement GroupMe and Discord senders in `backend/src/notifications/groupme.js` and `backend/src/notifications/discord.js`
- [x] T038 [US3] Implement dedupe and rate limiting in `backend/src/notifications/dedupe.js` and persistence in `backend/src/db/queries/notifications.js`
- [x] T039 [US3] Implement notification stage in `backend/src/pipeline/stages/notification.js`
- [x] T040 [US3] Implement notifications API handler in `backend/src/api/handlers/notifications.js` (wire in `backend/src/api/server.js`)
- [x] T041 [US3] Build notification history view and nav link in `frontend/src/views/notifications.js` and `frontend/src/main.js`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T042 Add validation checklist in `specs/001-define-caad-core/checklists/validation.md` for ingestion, grouping, and notifications
- [x] T043 Refine UI empty/error states and status badges in `frontend/src/styles.css` and `frontend/src/views/layout.js`
- [x] T044 Update local run guidance in `specs/001-define-caad-core/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can proceed in parallel after Phase 2 if staffed
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P2)**: Depends on User Story 1 (needs ingestion + transcripts)
- **User Story 3 (P3)**: Depends on User Story 1 (needs calls and UI)

### Within Each User Story

- Stage implementation before API exposure
- API before UI
- Validation wiring before relying on outputs

### Parallel Opportunities

- Setup tasks marked [P] can run in parallel
- UI tasks within a story marked [P] can run in parallel
- Schema and UI tasks in US2 marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Backend tasks that can run in parallel:
Task: "T014 [US1] Implement content hashing utility in backend/src/ingest/hash.js"
Task: "T018 [US1] Implement OpenAI client and transcription stage in backend/src/ai/openai.js and backend/src/pipeline/stages/transcription.js"

# Frontend tasks that can run in parallel:
Task: "T023 [US1] Build calls feed view in frontend/src/views/calls.js"
Task: "T024 [US1] Build call detail view in frontend/src/views/call-detail.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate end-to-end ingestion → UI visibility

### Incremental Delivery

1. Add User Story 2: extraction, grouping, rollups, geo
2. Add User Story 3: notifications and routing
3. Finish with polish and cross-cutting validation

---

## Notes

- Include explicit validation tasks when touching ingestion, schema/migrations,
  grouping logic, or notifications.
- Include migration and audit-trail tasks when schema changes are required.
- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Avoid vague tasks, same file conflicts, cross-story dependencies that break independence
