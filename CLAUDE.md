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

Optional but commonly set: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TRANSCRIPTION_MODEL`, `MAPBOX_ACCESS_TOKEN`, `MAPBOX_STYLE`, `NOTIFY_ENABLED`, `GROUPME_BOT_ID`, `DISCORD_WEBHOOK_URL`, plus tuning knobs in `backend/src/config/env.js` (`GROUPING_*`, `DIGEST_*`, `RE_ALERT_*`, `FEEDBACK_*`). All config flows through `loadConfig()` — do not read `process.env` directly outside that file.

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

All OpenAI calls go through `ai/adapter.js`, which lazy-requires `ai/openai.js`. Stages must use the adapter, never call `openai.js` directly — this is the seam tests stub against and where a future provider would plug in.

Strict-JSON outputs are validated against schemas in `ai/schema/*.json` via `ai/validate.js` (Ajv). On schema-validation failure the pipeline calls `ai/repair.js` to attempt one repair pass before failing. Evidence offsets in extraction payloads must match transcript text exactly — see `validateExtractionEvidence` and the fixture-driven `extraction-v2.test.js`.

### HTTP API (`backend/src/api/`)

The server is **vanilla `http.createServer`** with hand-rolled URL parsing in `server.js` and `routes.js` — there is no Express. When adding endpoints:

- Add the handler under `api/handlers/`.
- Wire it into `server.js` by matching `req.method` + URL prefix and parsing `parts = req.url.split("?")[0].split("/").filter(Boolean)`.
- Order matters: longer/more-specific prefixes (e.g. `/api/summary/digests`) must be checked **before** shorter ones (`/api/summary`).
- Hand `db`, `config`, and `pipeline` to handlers via the dependency object — handlers must not import them directly.

Realtime updates use SSE at `GET /api/events`. The backend emits via `services/events.js#emitRefresh(source)`; the frontend listens via `useSseStatus` and bumps a `refreshToken` to invalidate caches. After any state change a stage handler should call `emitRefresh(...)` (already done in `runStageWithTracking`).

### Database (`backend/src/db/`)

- `connection.js` — opens better-sqlite3.
- `migrations/NNN_*.sql` — append-only, applied automatically on startup; checksummed in `schema_migrations`.
- `queries/*.js` — one module per logical entity (`calls`, `incidents`, `stages`, `summaries`, `digests`, `map`, etc.). Handlers and stages should import these helpers rather than writing SQL inline.
- `reset.js` — backs up `caad.sqlite` to `caad.sqlite.bak-<timestamp>` then rebuilds. Refuses to run without `--confirm` / `--force` / `CAAD_RESET_CONFIRM=YES`.

Schema highlights worth knowing before touching data: `calls` (content-hash PK), `call_stages` + `stage_runs` (per-call stage state and history), `transcripts`, `metadata_extracts` (versioned by `schema_version`, e.g. `extraction.v2`), `incident_groups` + `incident_group_members`, `grouping_decisions` (audit), `agency_registry`, `reference_data` + `reference_embeddings`, `incident_rollups`, `digest_summaries`, `feedback_signals`. Foreign keys are enforced.

### Frontend (`frontend/src/`)

React 18 + Vite, no router (hash-based routing via `useHashRoute` — routes are `incidents` (default), `notifications`, `call/{id}`, `incident/{id}`). `App.jsx` is the single root that swaps the center pane based on the hash; the right column with the map and digest is shared across views.

- `api.js` — every backend call goes through this module; it builds query strings with `serializeFilters` from `state/filters.js`.
- `state/` — pure helpers for filters, formatting, playback, timeline. No global store; state is component-local plus a `refreshToken` propagated from `App`.
- `hooks/` — `useSseStatus` (auto-reconnecting SSE), `useDetailCache` (per-id TTL cache), `useHashRoute`, `useMapViewState`, `useTimelinePolling`.
- `config.js` — Sussex County map defaults, lifecycle windows (`AUTO_RESOLVE_MINUTES`, `MONITOR_WINDOW_MINUTES`), and the `VITE_MAPBOX_*` token wiring.
- Vite proxies `/api` → `http://localhost:3000`, so the frontend assumes the backend is up on port 3000 in dev.

## Conventions

- Backend uses CommonJS (`require` / `module.exports`); frontend uses ESM. Don't mix.
- All timestamps stored and exchanged as ISO 8601 strings. UUIDs (`crypto.randomUUID()`) are used for `run_id`, `notification_id`, etc.; call IDs are SHA-256 hashes (do not generate them yourself — use `ingest/hash.js`).
- AGENTS.md is auto-generated by the `/speckit.*` workflow under `specs/` and is rewritten by tooling — prefer adding durable guidance here in CLAUDE.md.
- Spec-driven development: each major feature has a folder under `specs/NNN-*/` with `spec.md`, `plan.md`, `data-model.md`, `quickstart.md`, and `contracts/`. When implementing a numbered feature, read its `quickstart.md` first for the verification scenarios.

## Things that bite

- **Don't edit applied migrations.** The checksum check will pass (it doesn't re-validate applied rows), but any new dev environment will get a different schema. Add `NNN_<next>.sql` instead.
- **The pipeline is single-threaded.** Long-running OpenAI calls block every other call's progression. Don't add `await` to anything that doesn't need it inside a stage handler.
- **Route ordering in `api/server.js`** — `/api/summary` matches `/api/summary/digests` if checked first. Always put specific paths before prefixes.
- **`runtime/` is gitignored** and contains the SQLite DB plus any local artifacts. Never commit anything from there. `.env*` and `node_modules/` are also ignored.
- **Frontend Mapbox token** must be exposed as `VITE_MAPBOX_ACCESS_TOKEN` (or set `MAPBOX_ACCESS_TOKEN` and let `vite.config.js` rewrite it). Without it, map components render blank tiles.
