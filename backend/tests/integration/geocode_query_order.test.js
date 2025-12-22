const test = require("node:test");
const assert = require("node:assert/strict");
const { buildGeocodeQueries } = require("../../src/pipeline/stages/geo");

test("geocode prefers address+cross street when available", () => {
  const payload = {
    address_normalized: "123 Main St",
    cross_street_1: "Linden St",
    city: "Newton"
  };
  const queries = buildGeocodeQueries(payload, null, "123 Main St");

  assert.equal(queries[0], "123 Main St and Linden St, Newton, NJ");
});

test("geocode falls back to cross street intersection when no address", () => {
  const payload = {
    cross_street_1: "Main St",
    cross_street_2: "Linden St",
    city: "Newton"
  };
  const queries = buildGeocodeQueries(payload, null, "Main St");

  assert.equal(queries[0], "Main St and Linden St, Newton, NJ");
});
