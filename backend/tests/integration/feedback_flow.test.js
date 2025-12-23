const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const {
  submitCallFeedbackHandler,
  submitIncidentFeedbackHandler
} = require("../../src/api/handlers/feedback");

function loadSql(relativePath) {
  return fs.readFileSync(
    path.join(__dirname, "..", "..", "src", "db", "migrations", relativePath),
    "utf8"
  );
}

function applyMigrations(db) {
  ["001_init.sql", "003_incident_centric.sql"].forEach((file) =>
    db.exec(loadSql(file))
  );
}

function setupDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  applyMigrations(db);

  const now = "2025-12-21T00:00:00.000Z";
  db.prepare(
    "INSERT INTO calls (call_id, source_path, first_seen_at, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("call-001", "/calls/Lakeland_EMS__Gen__123.wav", now, "completed", now, now);

  db.prepare(
    "INSERT INTO incident_groups (incident_id, normalized_address, incident_identifiers, group_confidence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("incident-001", "35 Cortland Drive", null, 0.8, now, now);

  db.prepare(
    "INSERT INTO incident_group_members (incident_id, call_id, link_reason, link_confidence, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run("incident-001", "call-001", "match", 0.9, now);

  return db;
}

function createReq({ method = "POST", url, body } = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.headers = { host: "localhost" };
  process.nextTick(() => {
    if (body !== undefined) {
      const payload = typeof body === "string" ? body : JSON.stringify(body);
      req.emit("data", Buffer.from(payload));
    }
    req.emit("end");
  });
  return req;
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

test("call feedback queues targeted stages", async () => {
  const db = setupDb();
  const enqueued = [];
  const pipeline = {
    enqueue: (callId, stageName) => enqueued.push({ callId, stageName })
  };
  const req = createReq({
    url: "/api/feedback/calls/call-001",
    body: { feedback_type: "wrong_location" }
  });
  const res = createRes();

  await submitCallFeedbackHandler(req, res, { db, callId: "call-001", pipeline });

  assert.equal(res.statusCode, 202);
  const payload = JSON.parse(res.body);
  assert.equal(payload.feedback_type, "wrong_location");
  assert.equal(payload.apply_status, "queued");
  assert.deepEqual(
    enqueued,
    [
      { callId: "call-001", stageName: "extraction" },
      { callId: "call-001", stageName: "geo" },
      { callId: "call-001", stageName: "grouping" },
      { callId: "call-001", stageName: "incidentSummary" }
    ]
  );
});

test("incident feedback queues stages for member calls", async () => {
  const db = setupDb();
  const enqueued = [];
  const pipeline = {
    enqueue: (callId, stageName) => enqueued.push({ callId, stageName })
  };
  const req = createReq({
    url: "/api/feedback/incidents/incident-001",
    body: { feedback_type: "wrong_grouping" }
  });
  const res = createRes();

  await submitIncidentFeedbackHandler(req, res, {
    db,
    incidentId: "incident-001",
    pipeline
  });

  assert.equal(res.statusCode, 202);
  const payload = JSON.parse(res.body);
  assert.equal(payload.feedback_type, "wrong_grouping");
  assert.equal(payload.apply_status, "queued");
  assert.deepEqual(
    enqueued,
    [
      { callId: "call-001", stageName: "grouping" },
      { callId: "call-001", stageName: "incidentSummary" }
    ]
  );
});
