const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateReferenceCandidates,
  adjustTownCrossStreets
} = require("../../src/pipeline/stages/extraction");

const referenceCandidates = {
  street: [
    { reference_id: "street-1", canonical_name: "Main St", aliases: [] },
    { reference_id: "street-2", canonical_name: "Linden St", aliases: ["Linden"] }
  ],
  town: [{ reference_id: "town-1", canonical_name: "Newton", aliases: [] }],
  poi: []
};

test("cross street that matches town is rejected", () => {
  const payload = { cross_street_1: "Newton" };
  const result = validateReferenceCandidates(payload, referenceCandidates);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.field === "cross_street_1"));
});

test("cross street that matches street candidate is accepted", () => {
  const payload = { cross_street_1: "Main St" };
  const result = validateReferenceCandidates(payload, referenceCandidates);

  assert.equal(result.ok, true);
});

test("city value that matches street candidate shifts to cross street", () => {
  const payload = { city: "Linden" };
  const adjusted = adjustTownCrossStreets({ ...payload }, referenceCandidates);

  assert.equal(adjusted.city, null);
  assert.equal(adjusted.cross_street_1, "Linden");
});
