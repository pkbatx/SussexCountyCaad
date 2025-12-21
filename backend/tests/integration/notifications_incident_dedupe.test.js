const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { evaluateIncidentNotification, buildIncidentDedupeKey } = require("../../src/notifications/rules");
const { createNotification, findLatestNotificationForSubject } = require("../../src/db/queries/notifications");

function loadSql(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", "..", "src", "db", "migrations", relativePath), "utf8");
}

test("incident notifications dedupe on unchanged summary", () => {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(loadSql("001_init.sql"));

  const rollup = { summary_text: "Initial incident summary" };
  const dedupeKey = buildIncidentDedupeKey({ incidentId: "incident-001", rollup });
  createNotification(db, {
    subjectType: "incident",
    subjectId: "incident-001",
    channel: "discord",
    routingRule: "default",
    dedupeKey,
    status: "sent",
    sentAt: "2025-12-20T00:00:00.000Z"
  });

  const lastNotification = findLatestNotificationForSubject(db, {
    subjectType: "incident",
    subjectId: "incident-001",
    channel: "discord"
  });

  const evaluation = evaluateIncidentNotification({
    rollup,
    lastNotification
  });

  assert.equal(evaluation.send, false);
  assert.equal(evaluation.reason, "no_significant_change");
});

test("incident notifications send when summary changes", () => {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(loadSql("001_init.sql"));

  const previous = { summary_text: "Initial incident summary" };
  createNotification(db, {
    subjectType: "incident",
    subjectId: "incident-001",
    channel: "discord",
    routingRule: "default",
    dedupeKey: buildIncidentDedupeKey({ incidentId: "incident-001", rollup: previous }),
    status: "sent",
    sentAt: "2025-12-20T00:00:00.000Z"
  });

  const lastNotification = findLatestNotificationForSubject(db, {
    subjectType: "incident",
    subjectId: "incident-001",
    channel: "discord"
  });

  const updated = { summary_text: "Updated summary with new details" };
  const evaluation = evaluateIncidentNotification({
    rollup: updated,
    lastNotification
  });

  assert.equal(evaluation.send, true);
  assert.equal(evaluation.reason, "summary_changed");
});
