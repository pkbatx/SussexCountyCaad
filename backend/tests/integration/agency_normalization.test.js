const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeAgency } = require("../../src/pipeline/agency-normalizer");

test("normalizes EMS agency tokens and strips noise", () => {
  const result = normalizeAgency({
    sourcePath: "/calls/Lakeland_EMS__Gen__20251221.wav"
  });

  assert.equal(result.agency, "Lakeland EMS");
  assert.equal(result.serviceType, "EMS");
  assert.ok(result.aliases.includes("Lakeland"));
});

test("preserves hyphenated agency names and service type", () => {
  const result = normalizeAgency({
    sourcePath: "/calls/Glenwood-Pochuck_EMS__Duty__001.wav"
  });

  assert.equal(result.agency, "Glenwood-Pochuck EMS");
  assert.equal(result.serviceType, "EMS");
});

test("keeps rescue token in canonical agency name", () => {
  const result = normalizeAgency({
    sourcePath: "/calls/Blue_Ridge_Rescue_EMS__Gen__042.wav"
  });

  assert.equal(result.agency, "Blue Ridge Rescue EMS");
  assert.equal(result.serviceType, "EMS");
});

test("collapses combined dispatch entity to canonical name", () => {
  const result = normalizeAgency({
    sourcePath: "/calls/Andover_Twp__Andover_Boro_FD__Siren.wav"
  });

  assert.equal(result.agency, "Andover Twp / Andover Boro FD");
  assert.equal(result.serviceType, "FD");
});
