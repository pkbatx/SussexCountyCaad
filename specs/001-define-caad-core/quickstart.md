# Quickstart: SussexCountyCAAD Core Workflow

## Goal

Run the local pipeline end-to-end so a new audio file becomes a call record and
appears in the UI with visible stage status.

## Prerequisites

- Node.js 20 LTS installed locally
- A local directory containing radio-call audio files (read-only mount)

## Configuration (local-only)

Set environment variables (example names):

- `CALLS_DIR` = absolute path to read-only calls directory
- `CAAD_DB_PATH` = absolute path to SQLite database file
- `OPENAI_API_KEY` = OpenAI API key for MVP
- `OPENAI_MODEL` = OpenAI model name (default: gpt-4o-mini)
- `GROUPME_BOT_ID` = GroupMe bot ID (optional for notifications)
- `DISCORD_WEBHOOK_URL` = Discord webhook URL (optional for notifications)
- `NOTIFY_ENABLED` = true/false

## Run (two terminals)

1. Start the backend (ingestion, pipeline, local API):
   - `npm run dev:backend`

2. Start the Vite UI:
   - `npm run dev:frontend`

3. Drop a new audio file into `CALLS_DIR` and verify:
   - Call appears in UI
   - Stage statuses update
   - Transcript/summaries populate as stages complete

## Validation Checklist

- New file creates a call with stable ID
- Duplicate file does not create a second call
- Stage failures appear in UI with retry action
- API endpoints respond locally
