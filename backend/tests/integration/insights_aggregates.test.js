const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const { refreshInsights } = require("../../src/services/insights");
const { listInsightMetrics } = require("../../src/db/queries/insights");

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
    "005_agency_registry.sql",
    "006_unit_registry.sql",
    "007_reference_embeddings.sql",
    "008_ui_ai_upgrade.sql"
  ].forEach((file) => db.exec(loadSql(file)));
}

test("insight aggregation stores agency and town counts", () => {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  applyMigrations(db);

  const now = "2025-12-21T01:00:00.000Z";
  db.prepare(
    "INSERT INTO agency_registry (agency_id, canonical_name, service_type, aliases_json, created_at, updated_at) VALUES (?, ?, ?, '[]', ?, ?)"
  ).run("agency-1", "Lakeland EMS", "EMS", now, now);

  db.prepare(
    "INSERT INTO calls (call_id, source_path, first_seen_at, status, created_at, updated_at, agency_id, agency_name, service_type, re_alert_flag) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run("call-1", "/calls/Lakeland_EMS__Gen__001.wav", now, "completed", now, now, "agency-1", "Lakeland EMS", "EMS", 1);

  db.prepare(
    "INSERT INTO stage_runs (run_id, call_id, stage_name, attempt_number, status, started_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("run-1", "call-1", "extraction", 1, "succeeded", now);

  const payload = {
    schema_version: "extraction.v2",
    call_id: "call-1",
    extracted_at: now,
    confidence_overall: 0.9,
    incident_type: "Medical",
    priority: null,
    jurisdiction: null,
    channel: null,
    talkgroup: null,
    units: [],
    incident_id: null,
    address_raw: "10 Market Street",
    address_normalized: "10 Market Street",
    cross_street_1: null,
    cross_street_2: null,
    landmark: null,
    city: "Newton",
    notes: null,
    field_confidence: {
      incident_type: 1,
      priority: 0,
      jurisdiction: 0,
      channel: 0,
      talkgroup: 0,
      units: 0,
      incident_id: 0,
      address_raw: 1,
      address_normalized: 1,
      cross_street_1: 0,
      cross_street_2: 0,
      landmark: 0,
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
  ).run("extract-1", "call-1", "run-1", "extraction.v2", JSON.stringify(payload), 0.9, now);

  const windowStart = "2025-12-21T00:00:00.000Z";
  const windowEnd = "2025-12-21T02:00:00.000Z";

  refreshInsights(db, { windowStart, windowEnd });

  const agencyMetrics = listInsightMetrics(db, {
    metricType: "agency_calls",
    windowStart,
    windowEnd
  });
  assert.equal(agencyMetrics.length, 1);
  assert.equal(agencyMetrics[0].group_key, "Lakeland EMS");
  assert.equal(agencyMetrics[0].value, 1);

  const townMetrics = listInsightMetrics(db, {
    metricType: "town_calls",
    windowStart,
    windowEnd
  });
  assert.equal(townMetrics.length, 1);
  assert.equal(townMetrics[0].group_key, "Newton");
  assert.equal(townMetrics[0].value, 1);
});
