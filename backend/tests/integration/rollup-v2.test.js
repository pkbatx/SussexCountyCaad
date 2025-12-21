const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { createIncidentRollup, listRollupsForIncident } = require("../../src/db/queries/rollups");

function setupDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");

  db.exec(
    "CREATE TABLE incident_groups (incident_id TEXT PRIMARY KEY, normalized_address TEXT, incident_identifiers TEXT, group_confidence REAL NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);"
  );
  db.exec(
    "CREATE TABLE stage_runs (run_id TEXT PRIMARY KEY, call_id TEXT NOT NULL, stage_name TEXT NOT NULL, attempt_number INTEGER NOT NULL, status TEXT NOT NULL, started_at TEXT NOT NULL, completed_at TEXT, error_detail TEXT);"
  );

  const rollupSql = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "..",
      "src",
      "db",
      "migrations",
      "002_rollup_artifacts.sql"
    ),
    "utf8"
  );
  db.exec(rollupSql);

  db.prepare(
    "INSERT INTO incident_groups (incident_id, normalized_address, incident_identifiers, group_confidence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("incident-001", "10 Market Street", "[]", 0.8, "2025-12-20T00:00:00.000Z", "2025-12-20T00:00:00.000Z");

  db.prepare(
    "INSERT INTO stage_runs (run_id, call_id, stage_name, attempt_number, status, started_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("run-001", "call-001", "incidentSummary", 1, "succeeded", "2025-12-20T00:00:00.000Z");

  db.prepare(
    "INSERT INTO stage_runs (run_id, call_id, stage_name, attempt_number, status, started_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("run-002", "call-002", "incidentSummary", 1, "succeeded", "2025-12-20T01:00:00.000Z");

  return db;
}

test("rollup artifacts append with versions", () => {
  const db = setupDb();

  createIncidentRollup(db, {
    incidentId: "incident-001",
    runId: "run-001",
    summaryText: "Initial summary",
    latestUpdate: ["Initial call logged"],
    keyFields: { address: "10 Market Street" },
    confidence: 0.7,
    openQuestions: ["Location unclear"],
    includedCallIds: ["call-001"]
  });

  createIncidentRollup(db, {
    incidentId: "incident-001",
    runId: "run-002",
    summaryText: "Updated summary",
    latestUpdate: ["Second call added"],
    keyFields: { address: "10 Market Street" },
    confidence: 0.75,
    openQuestions: [],
    includedCallIds: ["call-001", "call-002"]
  });

  const rollups = listRollupsForIncident(db, "incident-001");
  assert.equal(rollups.length, 2, "Expected two rollup versions");
  assert.equal(rollups[0].version, 2, "Expected latest rollup to be version 2");
  assert.deepEqual(rollups[0].included_call_ids, ["call-001", "call-002"]);
  assert.equal(rollups[1].version, 1, "Expected earlier rollup to be version 1");
});
