const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const { listCallsHandler } = require("../../src/api/handlers/calls");
const { listAgenciesHandler } = require("../../src/api/handlers/agencies");
const { upsertAgency } = require("../../src/db/queries/agencies");

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
    "008_ui_ai_upgrade.sql",
    "009_digest_summaries.sql"
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
    "INSERT INTO calls (call_id, source_path, first_seen_at, status, created_at, updated_at, agency_name) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    "call-002",
    "/calls/Franklin_EMS__Duty__456.wav",
    now,
    "completed",
    now,
    now,
    "Franklin EMS"
  );

  upsertAgency(db, {
    canonicalName: "Lakeland EMS",
    serviceType: "EMS",
    aliases: ["Lakeland", "EMS"]
  });
  upsertAgency(db, {
    canonicalName: "Franklin EMS",
    serviceType: "EMS",
    aliases: ["Franklin", "EMS"]
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

test("call list filters by canonical agency name", async () => {
  const db = setupDb();
  const req = {
    url: "/api/calls?agency=Lakeland%20EMS&limit=25",
    headers: { host: "localhost" }
  };
  const res = createRes();

  await listCallsHandler(req, res, { db });

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].agency, "Lakeland EMS");
});

test("agencies list returns canonical registry entries", async () => {
  const db = setupDb();
  const req = { url: "/api/agencies", headers: { host: "localhost" } };
  const res = createRes();

  await listAgenciesHandler(req, res, { db });

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  const names = payload.map((agency) => agency.canonical_name);
  assert.ok(names.includes("Lakeland EMS"));
  assert.ok(names.includes("Franklin EMS"));
});
