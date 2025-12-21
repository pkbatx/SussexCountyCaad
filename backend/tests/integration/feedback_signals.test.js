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
