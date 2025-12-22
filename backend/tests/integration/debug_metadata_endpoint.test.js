const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const { debugCallHandler } = require("../../src/api/handlers/debug");

function loadSql(relativePath) {
  return fs.readFileSync(
    path.join(__dirname, "..", "..", "src", "db", "migrations", relativePath),
    "utf8"
  );
}

function applyMigrations(db) {
  [
    "001_init.sql",
    "002_rollup_artifacts.sql",
    "003_incident_centric.sql",
    "004_reference_data_geo.sql",
    "005_agency_registry.sql"
  ].forEach((file) => db.exec(loadSql(file)));
}

function setupDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  applyMigrations(db);

  const now = "2025-12-21T00:00:00.000Z";
  db.prepare(
    "INSERT INTO calls (call_id, source_path, first_seen_at, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("call-001", "/calls/one.wav", now, "completed", now, now);

  db.prepare(
    "INSERT INTO stage_runs (run_id, call_id, stage_name, attempt_number, status, started_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("run-001", "call-001", "extraction", 1, "succeeded", now);

  const payload = {
    schema_version: "extraction.v2",
    call_id: "call-001",
    extracted_at: now,
    confidence_overall: 0.5,
    incident_type: null,
    agency: null,
    priority: null,
    jurisdiction: null,
    channel: null,
    talkgroup: null,
    units: [],
    incident_id: null,
    address_raw: null,
    address_normalized: null,
    cross_street_1: null,
    cross_street_2: null,
    landmark: null,
    city: null,
    notes: null,
    field_confidence: {
      incident_type: 0,
      priority: 0,
      jurisdiction: 0,
      channel: 0,
      talkgroup: 0,
      units: 0,
      incident_id: 0,
      address_raw: 0,
      address_normalized: 0,
      cross_street_1: 0,
      cross_street_2: 0,
      landmark: 0,
      city: 0,
      notes: 0
    },
    evidence: {
      incident_type: [],
      priority: [],
      jurisdiction: [],
      channel: [],
      talkgroup: [],
      units: [],
      incident_id: [],
      address_raw: [],
      address_normalized: [],
      cross_street_1: [],
      cross_street_2: [],
      landmark: [],
      city: [],
      notes: []
    }
  };

  db.prepare(
    "INSERT INTO metadata_extracts (extract_id, call_id, run_id, schema_version, payload_json, confidence_summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run("extract-001", "call-001", "run-001", "extraction.v2", JSON.stringify(payload), 0.5, now);

  return db;
}

function createRes() {
  return {
    statusCode: null,
    headers: null,
    body: null,
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
    },
    end(body) {
      this.body = body;
    }
  };
}

test("debug metadata endpoint is gated", async () => {
  const db = setupDb();
  const res = createRes();
  const req = { url: "/api/debug/calls/call-001", headers: { host: "localhost" } };
  const original = process.env.CAAD_DEBUG_METADATA;
  delete process.env.CAAD_DEBUG_METADATA;

  await debugCallHandler(req, res, { db, callId: "call-001" });

  assert.equal(res.statusCode, 403);
  const payload = JSON.parse(res.body);
  assert.equal(payload.error, "debug_disabled");

  process.env.CAAD_DEBUG_METADATA = original;
});

test("debug metadata endpoint returns extracts when enabled", async () => {
  const db = setupDb();
  const res = createRes();
  const req = { url: "/api/debug/calls/call-001", headers: { host: "localhost" } };
  const original = process.env.CAAD_DEBUG_METADATA;
  process.env.CAAD_DEBUG_METADATA = "true";

  await debugCallHandler(req, res, { db, callId: "call-001" });

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  assert.equal(payload.call_id, "call-001");
  assert.equal(payload.metadata_extracts.length, 1);

  process.env.CAAD_DEBUG_METADATA = original;
});
