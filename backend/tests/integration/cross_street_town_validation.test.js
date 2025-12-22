const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateReferenceCandidates
} = require("../../src/pipeline/stages/extraction");

const referenceCandidates = {
  street: [
    { reference_id: "street-1", canonical_name: "Main St", aliases: [] }
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
