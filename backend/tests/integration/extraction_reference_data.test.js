const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { buildPrompt } = require("../../src/pipeline/stages/extraction");

const fixturesDir = path.join(__dirname, "..", "fixtures");

function loadReferenceData() {
  const dataPath = path.join(fixturesDir, "reference_data.json");
  const items = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  return items.reduce(
    (acc, item) => {
      acc[item.ref_type] = acc[item.ref_type] || [];
      acc[item.ref_type].push(item);
      return acc;
    },
    { street: [], town: [], poi: [] }
  );
}

function loadTranscript(name) {
  return fs.readFileSync(path.join(fixturesDir, "transcripts", name), "utf8");
}

test("extraction prompt includes reference candidates", () => {
  const references = loadReferenceData();
  const transcriptText = loadTranscript("transcript-reference.txt");
  const extractedAt = "2025-12-20T00:00:00.000Z";

  const prompt = buildPrompt({
    transcriptText,
    callId: "call-001",
    extractedAt,
    referenceCandidates: references
  });

  assert.match(prompt, /Reference candidates:/);
  assert.match(prompt, /Filename metadata:/);
  assert.ok(prompt.includes("Market Street"));
  assert.ok(prompt.includes("Georgetown"));
  assert.ok(prompt.includes("Sussex Hospital"));
});
