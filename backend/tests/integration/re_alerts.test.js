const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const { applyReAlert } = require("../../src/pipeline/re-alert");

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

test("re-alert flag set for same incident + agency within window", () => {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  applyMigrations(db);

  const now = new Date("2025-12-21T00:00:00.000Z");
  const incidentId = "incident-1";
  const agencyId = "agency-1";

  db.prepare(
    "INSERT INTO incident_groups (incident_id, group_confidence, created_at, updated_at) VALUES (?, ?, ?, ?)"
  ).run(incidentId, 0.9, now.toISOString(), now.toISOString());

  db.prepare(
    "INSERT INTO agency_registry (agency_id, canonical_name, service_type, aliases_json, created_at, updated_at) VALUES (?, ?, ?, '[]', ?, ?)"
  ).run(agencyId, "Lakeland EMS", "EMS", now.toISOString(), now.toISOString());

  db.prepare(
    "INSERT INTO calls (call_id, source_path, first_seen_at, status, created_at, updated_at, agency_id, agency_name, service_type, re_alert_flag) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    "call-1",
    "/calls/Lakeland_EMS__Gen__001.wav",
    now.toISOString(),
    "completed",
    now.toISOString(),
    now.toISOString(),
    agencyId,
    "Lakeland EMS",
    "EMS",
    0
  );

  db.prepare(
    "INSERT INTO incident_group_members (incident_id, call_id, link_reason, link_confidence, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(incidentId, "call-1", "seed", 0.9, now.toISOString());

  const firstResult = applyReAlert({
    db,
    callId: "call-1",
    incidentId,
    agencyId,
    occurredAt: now.toISOString(),
    windowMinutes: 7
  });

  assert.equal(firstResult.isReAlert, false);
  assert.equal(
    db.prepare("SELECT re_alert_flag FROM calls WHERE call_id = ?").get("call-1")
      .re_alert_flag,
    0
  );

  const later = new Date(now.getTime() + 4 * 60 * 1000);
  db.prepare(
    "INSERT INTO calls (call_id, source_path, first_seen_at, status, created_at, updated_at, agency_id, agency_name, service_type, re_alert_flag) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    "call-2",
    "/calls/Lakeland_EMS__Gen__002.wav",
    later.toISOString(),
    "completed",
    later.toISOString(),
    later.toISOString(),
    agencyId,
    "Lakeland EMS",
    "EMS",
    0
  );
  db.prepare(
    "INSERT INTO incident_group_members (incident_id, call_id, link_reason, link_confidence, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(incidentId, "call-2", "seed", 0.9, later.toISOString());

  const secondResult = applyReAlert({
    db,
    callId: "call-2",
    incidentId,
    agencyId,
    occurredAt: later.toISOString(),
    windowMinutes: 7
  });

  assert.equal(secondResult.isReAlert, true);
  assert.equal(
    db.prepare("SELECT re_alert_flag FROM calls WHERE call_id = ?").get("call-2")
      .re_alert_flag,
    1
  );

  const stats = db
    .prepare(
      "SELECT re_alert_count FROM incident_agency_stats WHERE incident_id = ? AND agency_id = ?"
    )
    .get(incidentId, agencyId);
  assert.equal(stats.re_alert_count, 1);
});
