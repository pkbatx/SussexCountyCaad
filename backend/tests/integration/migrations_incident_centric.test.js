const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

function loadSql(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", "..", "src", "db", "migrations", relativePath), "utf8");
}

test("incident-centric migration creates required tables", () => {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");

  db.exec(loadSql("001_init.sql"));
  db.exec(loadSql("002_rollup_artifacts.sql"));
  db.exec(loadSql("003_incident_centric.sql"));

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all()
    .map((row) => row.name);

  assert.ok(tables.includes("grouping_decisions"));
  assert.ok(tables.includes("reference_data"));
  assert.ok(tables.includes("feedback_signals"));
});
