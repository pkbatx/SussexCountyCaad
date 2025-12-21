# Research: SussexCountyCAAD Core Workflow

## Decision 1: Backend runtime and language

**Decision**: Use Node.js 20 LTS with vanilla JavaScript.

**Rationale**: Aligns with Vite tooling, keeps dependencies minimal, and supports
local-first operation with built-in HTTP and file APIs.

**Alternatives considered**:
- Python (adds separate runtime/tooling; increases dependency surface)
- Go/Rust (higher setup cost for a small local app)

## Decision 2: File watching and idempotent ingestion

**Decision**: Use Node's `fs.watch` plus periodic directory scans to reconcile
missed events, with SHA-256 hashing to enforce deterministic call identity.

**Rationale**: Avoids adding heavy watcher dependencies while maintaining
reliable detection and dedupe safety.

**Alternatives considered**:
- chokidar (more robust, but adds a nontrivial dependency)

## Decision 3: SQLite access layer

**Decision**: Use a minimal SQLite driver (better-sqlite3) with explicit SQL
migrations and an internal migration runner.

**Rationale**: Keeps the dependency list short while supporting deterministic
transactional writes and local durability.

**Alternatives considered**:
- sqlite3 (asynchronous API; similar native dependency footprint)
- full ORM (too heavy for requirements)

## Decision 4: JSON schema validation for AI outputs

**Decision**: Use Ajv for JSON Schema validation and enforce reject + repair
retry on invalid JSON.

**Rationale**: Provides strict schema validation with a small, widely used
library and supports clear failure reporting.

**Alternatives considered**:
- Custom validators (higher risk and maintenance cost)

## Decision 5: AI integration strategy

**Decision**: Use an internal adapter that calls OpenAI endpoints via native
`fetch`, with provider-agnostic interfaces for future swap.

**Rationale**: Meets MVP requirement without adding SDK dependencies and keeps
provider-specific logic isolated.

**Alternatives considered**:
- OpenAI SDK (extra dependency not required for basic HTTP calls)
