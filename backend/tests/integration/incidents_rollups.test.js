const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { createIncidentRollup } = require("../../src/db/queries/rollups");
const { incidentDetailHandler } = require("../../src/api/handlers/incidents");

function loadSql(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", "..", "src", "db", "migrations", relativePath), "utf8");
}

function setupDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(loadSql("001_init.sql"));
  db.exec(loadSql("002_rollup_artifacts.sql"));

  const t0 = "2025-12-20T00:00:00.000Z";
  const t1 = "2025-12-20T01:00:00.000Z";

  db.prepare(
    "INSERT INTO calls (call_id, source_path, first_seen_at, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("call-001", "/tmp/call-001.wav", t0, "processing", t0, t0);
  db.prepare(
    "INSERT INTO calls (call_id, source_path, first_seen_at, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("call-002", "/tmp/call-002.wav", t1, "processing", t1, t1);

  db.prepare(
    "INSERT INTO incident_groups (incident_id, normalized_address, incident_identifiers, group_confidence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("incident-001", "10 Market Street", "[]", 0.8, t0, t0);

  db.prepare(
    "INSERT INTO stage_runs (run_id, call_id, stage_name, attempt_number, status, started_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("run-001", "call-001", "incidentSummary", 1, "succeeded", t0);

  db.prepare(
    "INSERT INTO stage_runs (run_id, call_id, stage_name, attempt_number, status, started_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("run-002", "call-002", "incidentSummary", 1, "succeeded", t1);

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

test("incident detail includes rollup history", async () => {
  const db = setupDb();
  const req = { url: "/incidents/incident-001", headers: { host: "localhost" } };
  const res = createRes();

  await incidentDetailHandler(req, res, { db, incidentId: "incident-001" });

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  assert.equal(payload.rollups.length, 2);
  assert.equal(payload.rollups[0].version, 2);
  assert.equal(payload.rollups[1].version, 1);
});
