const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { createFeedbackSignal, listFeedbackSignals } = require("../../src/db/queries/feedback");

function loadSql(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", "..", "src", "db", "migrations", relativePath), "utf8");
}

test("feedback signals persist with adjustments", () => {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(loadSql("001_init.sql"));
  db.exec(loadSql("003_incident_centric.sql"));

  const now = "2025-12-21T00:00:00.000Z";
  db.prepare(
    "INSERT INTO calls (call_id, source_path, first_seen_at, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("call-001", "/tmp/x.wav", now, "processing", now, now);
  db.prepare(
    "INSERT INTO incident_groups (incident_id, group_confidence, created_at, updated_at) VALUES (?, ?, ?, ?)"
  ).run("incident-001", 0.8, now, now);
  db.prepare(
    "INSERT INTO stage_runs (run_id, call_id, stage_name, attempt_number, status, started_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("run-001", "call-001", "grouping", 1, "succeeded", now);
  db.prepare(
    "INSERT INTO grouping_decisions (decision_id, call_id, incident_id, run_id, decision, confidence, requires_review, signals_json, explanation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run("decision-001", "call-001", "incident-001", "run-001", "new_incident", 0.8, 0, "[]", "ok", now);

  const feedbackId = createFeedbackSignal(db, {
    incidentId: "incident-001",
    callId: "call-001",
    priorDecisionId: "decision-001",
    signalType: "contradiction",
    details: { field: "city" },
    adjustment: { confidence_penalty: 0.05 }
  });

  const signals = listFeedbackSignals(db, { incidentId: "incident-001" });
  assert.equal(signals.length, 1);
  assert.equal(signals[0].feedback_id, feedbackId);
  assert.equal(signals[0].signal_type, "contradiction");
  assert.equal(signals[0].adjustment.confidence_penalty, 0.05);
});
