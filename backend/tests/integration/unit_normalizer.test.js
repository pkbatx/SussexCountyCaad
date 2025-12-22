const test = require("node:test");
const assert = require("node:assert/strict");
const { extractUnitCandidates } = require("../../src/pipeline/unit-normalizer");

test("extracts unit pairs from long dispatch sequences", () => {
  const text =
    "62646999 Fire, 35 Cortland Drive, Fawn Road on the cross, possible open burn.";
  const units = extractUnitCandidates(text).map((entry) => entry.unit).sort();
  assert.deepEqual(units, ["62", "64", "69", "99"]);
});

test("extracts single units around service keywords", () => {
  const text =
    "Request to respond 43 EMS, 43 Fire Mutual Aid in Newton. Sparta EMS 7 north short trail.";
  const units = extractUnitCandidates(text).map((entry) => entry.unit).sort();
  assert.deepEqual(units, ["43", "7"]);
});

test("does not treat times as units", () => {
  const text = "26 Fire got on arrival, 1706.";
  const units = extractUnitCandidates(text).map((entry) => entry.unit).sort();
  assert.deepEqual(units, ["26"]);
});
