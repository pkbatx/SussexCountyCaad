const test = require("node:test");
const assert = require("node:assert/strict");
const { selectIncident } = require("../../src/pipeline/grouping-policy");

const existingIncidents = [{ incident_id: "incident-123" }];

function buildPayload(overrides = {}) {
  return {
    decision: "join_incident",
    matched_existing_incident_id: "incident-123",
    confidence: 0.9,
    requires_review: false,
    signals: [
      {
        type: "text_similarity",
        value: "similar",
        weight: 0.8
      }
    ],
    ...overrides
  };
}

test("grouping policy requires location or incident id signal for joins", () => {
  const payload = buildPayload();
  const result = selectIncident({ payload, existingIncidents, threshold: 0.7 });
  assert.equal(result.incidentId, null);
  assert.equal(result.requiresReview, true);
  assert.equal(result.reason, "missing_location_signal");
});

test("grouping policy allows join with location signal", () => {
  const payload = buildPayload({
    signals: [
      { type: "address_match", value: "Main St", weight: 0.8 }
    ]
  });
  const result = selectIncident({ payload, existingIncidents, threshold: 0.7 });
  assert.equal(result.incidentId, "incident-123");
  assert.equal(result.requiresReview, false);
});
