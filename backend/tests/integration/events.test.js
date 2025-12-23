const test = require("node:test");
const assert = require("node:assert");
const { emitRefresh, onRefresh } = require("../../src/services/events");

test("emitRefresh triggers refresh handlers", () => {
  let received = null;
  const unsubscribe = onRefresh((payload) => {
    received = payload;
  });

  emitRefresh("ingest");
  unsubscribe();

  assert.ok(received, "expected refresh payload");
  assert.strictEqual(received.source, "ingest");
  assert.ok(received.emittedAt, "expected emittedAt timestamp");
});
