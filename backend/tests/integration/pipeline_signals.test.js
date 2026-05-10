const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const {
  createSignal,
  listSignals,
  listSignalsForCalls
} = require("../../src/db/queries/pipeline_signals");
const { collectDataQualityFlags } = require("../../src/pipeline/stages/incident-summary");

function loadSql(relativePath) {
  return fs.readFileSync(
    path.join(__dirname, "..", "..", "src", "db", "migrations", relativePath),
    "utf8"
  );
}

function setupDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(loadSql("001_init.sql"));
  db.exec(loadSql("010_pipeline_signals.sql"));
  // Insert a placeholder call so the FK can resolve.
  db.prepare(
    `INSERT INTO calls (call_id, source_path, file_size_bytes, audio_format, first_seen_at, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "call-001",
    "/tmp/x.wav",
    1,
    "wav",
    new Date().toISOString(),
    "processing",
    new Date().toISOString(),
    new Date().toISOString()
  );
  return db;
}

test("pipeline signals roundtrip and filter", () => {
  const db = setupDb();
  createSignal(db, {
    callId: "call-001",
    stage: "extraction",
    signal: "ambiguous",
    reason: "low_confidence:address_normalized; ambiguous_location"
  });
  createSignal(db, {
    callId: "call-001",
    stage: "grouping",
    signal: "retry_grouping",
    reason: "singleton incident"
  });

  const all = listSignals(db, { callId: "call-001" });
  assert.equal(all.length, 2);

  const ambiguousOnly = listSignals(db, { callId: "call-001", signal: "ambiguous" });
  assert.equal(ambiguousOnly.length, 1);
  assert.equal(ambiguousOnly[0].stage, "extraction");

  const stageOnly = listSignals(db, { stage: "grouping" });
  assert.equal(stageOnly.length, 1);
});

test("collectDataQualityFlags maps reasons to flags", () => {
  const flags = collectDataQualityFlags([
    { signal: "ambiguous", reason: "low_confidence:city; ambiguous_location" },
    { signal: "ok", reason: null }
  ]);
  assert.deepEqual(flags.sort(), ["ambiguous_location", "low_confidence_inputs"].sort());
});

test("listSignalsForCalls returns rows for any matching call", () => {
  const db = setupDb();
  createSignal(db, { callId: "call-001", stage: "extraction", signal: "ambiguous", reason: "x" });
  const rows = listSignalsForCalls(db, ["call-001", "call-missing"]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].call_id, "call-001");
});

test("invalid signal value throws", () => {
  const db = setupDb();
  assert.throws(() =>
    createSignal(db, {
      callId: "call-001",
      stage: "extraction",
      signal: "not_a_real_signal",
      reason: ""
    })
  );
});
