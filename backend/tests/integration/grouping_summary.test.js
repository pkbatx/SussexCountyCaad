const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeGroupingPayload,
  buildGroupingSummary
} = require("../../src/pipeline/stages/grouping");

test("grouping summary trims signals and formats explanation", () => {
  const payload = normalizeGroupingPayload(
    {
      decision: "join_incident",
      confidence: 0.82,
      requires_review: false,
      signals: [
        { type: "address_match", value: "10 Market St", weight: 0.9 },
        { type: "time_proximity", value: "within 5min", weight: 0.7 },
        { type: "jurisdiction_match", value: "Sussex", weight: 0.6 }
      ]
    },
    2
  );

  assert.equal(payload.signals.length, 2);
  const summary = buildGroupingSummary(payload);
  assert.match(summary, /join_incident/);
  assert.match(summary, /address match/);
});
