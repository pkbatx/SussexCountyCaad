const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { notifyWithRetry } = require("../../src/services/notifications");
const { listNotificationLog } = require("../../src/db/queries/notification_log");

function loadSql(relativePath) {
  return fs.readFileSync(
    path.join(__dirname, "..", "..", "src", "db", "migrations", relativePath),
    "utf8"
  );
}

function setupDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(loadSql("011_notification_log.sql"));
  return db;
}

function fakeResponse({ status, body = "" }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body
  };
}

test("notifyWithRetry logs success on first 200", async () => {
  const db = setupDb();
  const result = await notifyWithRetry({
    db,
    channel: "groupme",
    payload: { text: "hi" },
    send: async () => fakeResponse({ status: 202 })
  });

  assert.equal(result.ok, true);
  assert.equal(result.attempt, 1);
  const logs = listNotificationLog(db, {});
  assert.equal(logs.length, 1);
  assert.equal(logs[0].status, 202);
  assert.equal(logs[0].error, null);
});

test("notifyWithRetry retries once on 503 and logs both attempts", async () => {
  const db = setupDb();
  let calls = 0;
  await assert.rejects(
    notifyWithRetry({
      db,
      channel: "discord",
      payload: { content: "x" },
      send: async () => {
        calls += 1;
        return fakeResponse({ status: 503, body: "upstream" });
      }
    })
  );
  assert.equal(calls, 2);
  const logs = listNotificationLog(db, {});
  assert.equal(logs.length, 2);
  assert.deepEqual(
    logs.map((row) => row.attempt).sort(),
    [1, 2]
  );
});

test("notifyWithRetry does not retry 4xx", async () => {
  const db = setupDb();
  let calls = 0;
  await assert.rejects(
    notifyWithRetry({
      db,
      channel: "discord",
      payload: { content: "x" },
      send: async () => {
        calls += 1;
        return fakeResponse({ status: 400, body: "bad" });
      }
    })
  );
  assert.equal(calls, 1);
});

test("notifyWithRetry treats AbortError as timeout and retries", async () => {
  const db = setupDb();
  let calls = 0;
  await assert.rejects(
    notifyWithRetry({
      db,
      channel: "groupme",
      payload: {},
      send: async () => {
        calls += 1;
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      }
    })
  );
  assert.equal(calls, 2);
  const logs = listNotificationLog(db, {});
  assert.ok(logs.some((row) => row.error === "timeout"));
});
