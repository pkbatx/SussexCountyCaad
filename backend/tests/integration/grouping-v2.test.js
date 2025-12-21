const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { validatePayload } = require("../../src/ai/validate");

const schemaPath = path.join(__dirname, "..", "..", "src", "ai", "schema", "grouping.json");
const fixturesDir = path.join(__dirname, "..", "fixtures", "grouping-v2");

function listFixtureBases() {
  return fs
    .readdirSync(fixturesDir)
    .filter((name) => name.endsWith(".json") && !name.endsWith(".meta.json"))
    .map((name) => name.replace(/\.json$/, ""));
}

test("grouping v2 fixtures validate schema and review thresholds", () => {
  const bases = listFixtureBases();
  assert.ok(bases.length > 0, "Expected grouping fixtures");

  bases.forEach((base) => {
    const payloadPath = path.join(fixturesDir, `${base}.json`);
    const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));

    const schemaResult = validatePayload(schemaPath, payload);
    assert.equal(
      schemaResult.ok,
      true,
      `Schema validation failed for ${base}: ${JSON.stringify(schemaResult.errors)}`
    );

    if (payload.confidence < 0.7) {
      assert.equal(
        payload.requires_review,
        true,
        `Expected requires_review for ${base} with low confidence`
      );
    }
  });
});
