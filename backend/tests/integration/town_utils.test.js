const test = require("node:test");
const assert = require("node:assert/strict");
const {
  extractTownFromGeocode,
  normalizeTownQuery
} = require("../../src/geo/town-utils");

test("normalizeTownQuery ignores county values", () => {
  assert.equal(normalizeTownQuery("Sussex County"), "");
});

test("normalizeTownQuery strips township suffixes", () => {
  assert.equal(normalizeTownQuery("Andover Township"), "Andover");
});

test("extractTownFromGeocode prefers metadata town", () => {
  const town = extractTownFromGeocode({
    source: "reference",
    metadata: { town: "Sparta" }
  });
  assert.equal(town, "Sparta");
});

test("extractTownFromGeocode uses place context", () => {
  const town = extractTownFromGeocode({
    response: {
      features: [
        {
          place_type: ["address"],
          text: "35 Cortland Drive",
          context: [
            { id: "place.123", text: "Newton" },
            { id: "district.456", text: "Sussex County" }
          ]
        }
      ]
    }
  });
  assert.equal(town, "Newton");
});

test("extractTownFromGeocode prefers locality within Sussex County", () => {
  const town = extractTownFromGeocode({
    response: {
      features: [
        {
          place_type: ["address"],
          text: "35 Cortland Drive",
          context: [
            { id: "locality.586607340", text: "Wantage Township" },
            { id: "place.320432364", text: "Sussex" },
            { id: "district.22456044", text: "Sussex County" }
          ]
        }
      ]
    }
  });
  assert.equal(town, "Wantage Township");
});

test("extractTownFromGeocode ignores non-Sussex/Warren counties", () => {
  const town = extractTownFromGeocode({
    response: {
      features: [
        {
          place_type: ["address"],
          text: "35 Cortland Drive",
          context: [
            { id: "place.345204972", text: "Warwick" },
            { id: "district.17606380", text: "Orange County" }
          ]
        }
      ]
    }
  });
  assert.equal(town, null);
});
