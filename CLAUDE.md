# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SussexCountyCAAD is a local-first system that ingests recorded public-safety dispatch audio, transcribes and extracts metadata via OpenAI, groups calls into incidents, and serves a React operator console. It is a single-machine app: a Node.js backend watches a calls directory, processes files through a staged pipeline, and persists everything to a local SQLite database; a Vite/React frontend talks to it over HTTP + Server-Sent Events.

Two top-level npm projects live under `backend/` and `frontend/`. The root `package.json` is just a thin convenience wrapper.

## Commands

All commands assume Node.js >= 20.

```bash
# From repo root (delegates via --prefix):
npm run dev:backend      # node src/index.js — starts API, watcher, pipeline
npm run dev:frontend     # vite dev server on :5173, proxies /api -> :3000
npm run db:reset         # destructive: backs up DB and re-runs migrations + reference ingest

# Install (run once per workspace):
npm --prefix backend install
npm --prefix frontend install

# Tests use the Node built-in runner (no Jest/Vitest). There is no `npm test` script.
node --test backend/tests/integration                       # all backend tests
node --test backend/tests/integration/grouping_summary.test.js   # single test file

# Frontend has no automated tests; build/preview are the only checks:
npm --prefix frontend run build
npm --prefix frontend run preview

# DB reset requires explicit consent:
npm run db:reset -- --confirm           # or set CAAD_RESET_CONFIRM=YES
```

There is no lint config in the repo. AGENTS.md mentions `npm test && npm run lint` as a generic command but neither script is wired up; do not invent them.

## Environment

The backend reads `.env` from the repo root first, then falls back to `backend/.env`. The Vite config also loads from the repo root (`envDir: ..`) so `MAPBOX_ACCESS_TOKEN` is shared.

Required:
- `CALLS_DIR` — absolute path to the read-only directory of dispatch audio files the watcher scans.
- `CAAD_DB_PATH` — absolute path to the SQLite file (e.g. `runtime/data/caad.sqlite`).

Optional but commonly set: `AI_PROVIDER` (default `anthropic`), `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-sonnet-4-6`), `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TRANSCRIPTION_MODEL`, `MAPBOX_ACCESS_TOKEN`, `MAPBOX_STYLE`, `NOTIFY_ENABLED`, `GROUPME_BOT_ID`, `DISCORD_WEBHOOK_URL`, `LOG_LEVEL`, `FRONTEND_ORIGIN` (production CORS lock), plus tuning knobs in `backend/src/config/env.js` (`GROUPING_*`, `DIGEST_*`, `RE_ALERT_*`, `FEEDBACK_*`). All config flows through `loadConfig()` — do not read `process.env` directly outside that file. `.env.example` at the repo root documents the full surface.

## Architecture

### Backend startup (`backend/src/index.js`)

`main()` runs in this exact order — later steps assume earlier ones completed:

1. `loadConfig()` — env vars + dotenv, single source of truth for runtime config.
2. `openDatabase()` — opens better-sqlite3 with `foreign_keys=ON` and `journal_mode=WAL`.
3. `runMigrations(db)` — applies any unapplied SQL files from `backend/src/db/migrations/` in lexical order, recording version + checksum in `schema_migrations`. **Migrations are immutable once applied — add a new numbered file rather than editing an existing one.**
4. `ingestReferenceData()` — loads POI / streets+towns reference JSON into the `reference_data` table and (optionally) computes embeddings.
5. `startPipeline()` → `startApiServer()` → `startWatcher()`. The watcher kicks off processing for any files already in `CALLS_DIR`, so the API and pipeline must exist first.

### The processing pipeline (`backend/src/pipeline/`)

The pipeline is a single in-process FIFO queue (`runner.js`) that runs **one stage at a time**. Each call moves through stages by enqueuing the next stage at the end of the previous handler:

```
ingest → transcription → extraction → summary → grouping → geo → notification → incidentSummary → feedback
```

Stage handlers live in `pipeline/stages/<name>.js` and are wired up by name in `pipeline/stages/index.js`. Each handler is invoked through `runStageWithTracking()` (`pipeline/stage-runner.js`), which:

- Creates a `stage_runs` row, sets `call_stages.status='running'`.
- Awaits the handler.
- On success: marks succeeded, emits a `refresh` event (drives SSE).
- On failure: marks failed with `last_error`, still emits `refresh`, and rethrows. The queue continues with the next job; failed stages can be retried via `POST /api/calls/:id/retry`.

When adding a new stage: register it in `stages/index.js`, write the handler with the signature `async ({ config, db, callId, runId, pipeline })`, and have the previous stage call `pipeline.enqueue(callId, "<your-stage>")`. Do not call stage handlers directly — always go through `pipeline.enqueue` so tracking, retries, and SSE refreshes work.

### Identity & idempotency

Call identity is the SHA-256 content hash of the audio file (`ingest/hash.js`). The watcher rescans `CALLS_DIR` on `fs.watch` events plus a 10-second poll; `validateIdempotency()` short-circuits files already in the DB. Filename timestamps (`YYYY-MM-DD-HH-MM-SS` style) are parsed for `first_seen_at` but are advisory.

### AI layer (`backend/src/ai/`)

All AI calls go through `ai/adapter.js`, which dispatches `extractMetadata`, `groupIncident`, `summarizeDigest`, and `summarizeTranscriptDigest` to the provider selected by `config.aiProvider` (default `anthropic`, override with `openai`). The two providers live in `ai/providers/anthropic.js` and `ai/providers/openai.js` and expose a unified `complete({ systemPrompt, userPrompt, schema, toolName })`. Anthropic enforces structured output via a single forced `tool_use` block whose `input_schema` is the JSON schema; OpenAI uses `response_format: json_object` (the schema is in the prompt). `transcribe()` and `embedTexts()` always go through the OpenAI provider — Anthropic has no audio or embeddings APIs. Stages must use the adapter, never the providers directly.

`ai/openai.js` at the top level is now a backwards-compat shim that re-exports `transcribe` and `embedTexts` from the provider; new code should `require("./providers/openai")` (or use the adapter).

Strict-JSON outputs are validated against schemas in `ai/schema/*.json` via `ai/validate.js` (Ajv). On schema-validation failure the pipeline calls `ai/repair.js` to attempt one repair pass before failing. Evidence offsets in extraction payloads must match transcript text exactly — see `validateExtractionEvidence` and the fixture-driven `extraction-v2.test.js`. The Anthropic provider inlines `$ref`s and strips `$schema`/`definitions` before passing the schema to `tool_use.input_schema` because Anthropic's tool-schema validator rejects what Ajv tolerates.

### HTTP API (`backend/src/api/`)

The server is **Fastify v5** (`server.js`) with `@fastify/cors`. Every existing handler under `api/handlers/` keeps the legacy `(req, res, deps)` signature — each Fastify route calls `reply.hijack()` and forwards `request.raw` / `reply.raw` to the handler so the handler writes directly to the underlying Node socket. Route registrations all live in `server.js`; there is no longer a `routes.js` module. When adding endpoints:

- Add the handler under `api/handlers/` with the `(req, res, deps)` signature.
- Register it in `server.js` with the `bridgeWith(handler, (request) => ({...}))` helper, supplying any path params from `request.params`.
- Order still matters when registering prefixes (e.g. `/api/notifications/log` must register before `/api/notifications`) — Fastify's prefix matcher honors first-registered when paths overlap.
- CORS uses `origin: true` in dev; if `config.frontendOrigin` is set it locks to that origin in production.

`/healthz` is a Fastify-native readiness route alongside the bridged `/api/health`.

Realtime updates use SSE at `GET /api/events`. The handler uses `reply.hijack()` and writes to `reply.raw` directly: per-emit `event: refresh` lines plus a 25s keepalive, with `req.on("close", …)` unsubscribing from the in-process emitter. The backend emits via `services/events.js#emitRefresh(source)`; the frontend listens via `useSseStatus` and bumps a `refreshToken` to invalidate caches. After any state change a stage handler should call `emitRefresh(...)` (already done in `runStageWithTracking`).

### Database (`backend/src/db/`)

- `connection.js` — opens better-sqlite3.
- `migrations/NNN_*.sql` — append-only, applied automatically on startup; checksummed in `schema_migrations`.
- `queries/*.js` — one module per logical entity (`calls`, `incidents`, `stages`, `summaries`, `digests`, `map`, etc.). Handlers and stages should import these helpers rather than writing SQL inline.
- `reset.js` — backs up `caad.sqlite` to `caad.sqlite.bak-<timestamp>` then rebuilds. Refuses to run without `--confirm` / `--force` / `CAAD_RESET_CONFIRM=YES`.

Schema highlights worth knowing before touching data: `calls` (content-hash PK), `call_stages` + `stage_runs` (per-call stage state and history), `transcripts`, `metadata_extracts` (versioned by `schema_version`, e.g. `extraction.v2`), `incident_groups` + `incident_group_members`, `grouping_decisions` (audit), `agency_registry`, `reference_data` + `reference_embeddings`, `incident_rollups`, `digest_summaries`, `feedback_signals`, `pipeline_signals` (agentic-loop breadcrumbs), `notification_log` (per-attempt notification audit). Foreign keys are enforced.

### Agentic pipeline corridor (`backend/src/pipeline/stages/`)

The extraction → grouping → incidentSummary corridor writes to the `pipeline_signals` table to communicate confidence concerns:

- **extraction** evaluates `field_confidence` after a successful schema-validated payload; if any populated field has confidence < 0.6 *or* every location field (`address_normalized`, `address_raw`, `landmark`) is empty, it writes `signal='ambiguous'` with a `reason` summarizing the offenders. Ambiguity is advisory — `grouping` is still enqueued normally.
- **grouping** reads ambiguous signals before building the prompt and prepends a directive to weight geographic proximity over call-type similarity. After grouping, if the assigned incident has fewer than 2 members and the call had ambiguous extraction, it writes `signal='retry_grouping'` as a breadcrumb (no supervisor implementation yet).
- **incidentSummary** aggregates signals across all member calls and emits `data_quality_flags` inside `key_fields_json` so the frontend can render the ⚠ low-confidence indicator without a second fetch.

`GET /api/signals?call_id&stage&signal&limit&offset` exposes the table; the frontend's `useSignals(callId)` hook consumes it.

### Notifications (`backend/src/services/notifications.js` + `backend/src/notifications/`)

`notifyWithRetry({ db, channel, payload, send, timeoutMs })` is the shared send wrapper used by both `sendGroupMe` and `sendDiscord`. Each attempt is bounded by an `AbortController` (default 5s); on 5xx or `AbortError` it retries once. Every attempt — successful or not — is written to `notification_log`. The wrapper still throws on final failure so the existing notification stage's `try/catch` flow is unchanged. `GET /api/notifications/log?limit&offset&channel` exposes the audit log.

### Logging (`backend/src/services/logger.js`)

Single shared `pino` instance, NDJSON to stdout, level governed by `LOG_LEVEL`. All `console.{log,error,warn}` calls in `pipeline/`, `api/`, `services/`, and `ai/` have been replaced with structured calls — the convention is `log.info({ callId, stage, ... }, "human-readable msg")`. `db/reset.js` and tests intentionally still use `console` for CLI / fixture output.

### Frontend (`frontend/src/`)

React 18 + Vite, no router (hash-based routing via `useHashRoute` — routes are `incidents` (default), `notifications`, `call/{id}`, `incident/{id}`). `App.jsx` is the single root and lays the page out as a three-column **tactical-shell** grid: 56px `HeaderBar`, 240px `LeftRail` (nav + collapsible pipeline-health), flex center pane, optional 320px right rail (map + digest); the right rail is suppressed on the notifications view.

- **Tailwind v4 (CSS-first config)** in `src/styles.css` via `@import "tailwindcss/theme.css"` + `@import "tailwindcss/utilities.css"` — no preflight reset, so the existing `legacy-styles.css` keeps governing components that have not yet been redesigned. The `@theme` block exposes the tactical-dark palette (`bg-base`, `bg-surface`, `bg-raised`, `border`, `border-active`, `text-primary/muted/dim`, `accent-blue/amber/red/green/cyan`) and the IBM Plex Sans/Mono fonts to utility classes.
- **Vite config is `vite.config.mjs`** — `@tailwindcss/vite` ships ESM-only and Vite 5 cannot `require()` it from a CJS config.
- `api.js` — every backend call goes through this module; it builds query strings with `serializeFilters` from `state/filters.js`. Includes `listSignals`, `listNotificationLog` for the agentic corridor and notification feed.
- `state/` — pure helpers for filters, formatting, playback, timeline. No global store; state is component-local plus a `refreshToken` propagated from `App`.
- `hooks/` — `useSseStatus` (auto-reconnecting SSE), `useDetailCache` (per-id TTL cache), `useHashRoute`, `useMapViewState`, `useTimelinePolling`, `useSignals` (per-call agentic-loop signals).
- `config.js` — Sussex County map defaults, lifecycle windows (`AUTO_RESOLVE_MINUTES`, `MONITOR_WINDOW_MINUTES`), and the `VITE_MAPBOX_*` token wiring.
- Vite proxies `/api` → `http://localhost:3000`, so the frontend assumes the backend is up on port 3000 in dev.

The dense `IncidentsBoardDense` and `NotificationFeed` are the live components used by `App.jsx`; the legacy `IncidentsBoard` and `NotificationsView` are still in the tree for reference but no route mounts them.

## Conventions

- Backend uses CommonJS (`require` / `module.exports`); frontend uses ESM. Don't mix. (Exception: `frontend/vite.config.mjs` is ESM by extension, required by `@tailwindcss/vite`.)
- All timestamps stored and exchanged as ISO 8601 strings. UUIDs (`crypto.randomUUID()`) are used for `run_id`, `notification_id`, `pipeline_signals.id`, `notification_log.id`, etc.; call IDs are SHA-256 hashes (do not generate them yourself — use `ingest/hash.js`).
- AGENTS.md is auto-generated by the `/speckit.*` workflow under `specs/` and is rewritten by tooling — prefer adding durable guidance here in CLAUDE.md.
- Spec-driven development: each major feature has a folder under `specs/NNN-*/` with `spec.md`, `plan.md`, `data-model.md`, `quickstart.md`, and `contracts/`. When implementing a numbered feature, read its `quickstart.md` first for the verification scenarios.

## Things that bite

- **Don't edit applied migrations.** The checksum check will pass (it doesn't re-validate applied rows), but any new dev environment will get a different schema. Add `NNN_<next>.sql` instead.
- **The pipeline is single-threaded.** Long-running OpenAI calls block every other call's progression. Don't add `await` to anything that doesn't need it inside a stage handler.
- **Route ordering in `api/server.js`** — `/api/summary` matches `/api/summary/digests` if checked first. Always put specific paths before prefixes.
- **`runtime/` is gitignored** and contains the SQLite DB plus any local artifacts. Never commit anything from there. `.env*` and `node_modules/` are also ignored.
- **Frontend Mapbox token** must be exposed as `VITE_MAPBOX_ACCESS_TOKEN` (or set `MAPBOX_ACCESS_TOKEN` and let `vite.config.js` rewrite it). Without it, map components render blank tiles.
