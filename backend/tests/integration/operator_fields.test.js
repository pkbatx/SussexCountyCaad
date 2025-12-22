const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const { listCallsHandler, callDetailHandler } = require("../../src/api/handlers/calls");

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
    "INSERT INTO calls (call_id, source_path, first_seen_at, status, created_at, updated_at, agency_name) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    "call-001",
    "/calls/Lakeland_EMS__Gen__123.wav",
    now,
    "completed",
    now,
    now,
    "Lakeland EMS"
  );

  db.prepare(
    "INSERT INTO stage_runs (run_id, call_id, stage_name, attempt_number, status, started_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("run-001", "call-001", "extraction", 1, "succeeded", now);

  const payload = {
    schema_version: "extraction.v2",
    call_id: "call-001",
    extracted_at: now,
    confidence_overall: 0.9,
    incident_type: "Medical",
    priority: null,
    jurisdiction: "Sussex",
    channel: null,
    talkgroup: null,
    units: [],
    incident_id: null,
    address_raw: "10 Market Street",
    address_normalized: "10 Market Street",
    cross_street_1: "High Street",
    cross_street_2: null,
    landmark: "Sussex Hospital",
    city: "Newton",
    notes: null,
    field_confidence: {
      incident_type: 1,
      priority: 0,
      jurisdiction: 1,
      channel: 0,
      talkgroup: 0,
      units: 0,
      incident_id: 0,
      address_raw: 1,
      address_normalized: 1,
      cross_street_1: 1,
      cross_street_2: 0,
      landmark: 1,
      city: 1,
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
  ).run("extract-001", "call-001", "run-001", "extraction.v2", JSON.stringify(payload), 0.9, now);

  db.prepare(
    "INSERT INTO summaries (summary_id, subject_type, subject_id, run_id, summary_text, created_at, version) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run("summary-001", "call", "call-001", "run-001", "Summary text", now, 1);

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

test("call list returns normalized operator fields without model metadata", async () => {
  const db = setupDb();
  const req = { url: "/api/calls?limit=1", headers: { host: "localhost" } };
  const res = createRes();

  await listCallsHandler(req, res, { db });

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  assert.equal(payload.items.length, 1);
  const item = payload.items[0];
  assert.equal(item.agency, "Lakeland EMS");
  assert.equal(item.incident_type, "Medical");
  assert.equal(item.address, "10 Market Street");
  assert.equal(item.town, "Newton");
  assert.equal(item.cross_street, "High Street");
  assert.equal(item.poi, "Sussex Hospital");
  assert.equal(item.summary, "Summary text");
  assert.equal(item.confidence_overall, undefined);
  assert.equal(item.field_confidence, undefined);
  assert.equal(item.evidence, undefined);
});

test("call detail omits metadata extracts from operator response", async () => {
  const db = setupDb();
  const req = { url: "/api/calls/call-001", headers: { host: "localhost" } };
  const res = createRes();

  await callDetailHandler(req, res, { db, callId: "call-001" });

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  assert.ok(payload.call);
  assert.equal(Object.prototype.hasOwnProperty.call(payload, "metadataExtracts"), false);
});
