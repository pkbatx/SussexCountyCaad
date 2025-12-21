const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { validatePayload, validateExtractionEvidence } = require("../../src/ai/validate");

const schemaPath = path.join(__dirname, "..", "..", "src", "ai", "schema", "metadata.json");
const fixturesDir = path.join(__dirname, "..", "fixtures", "extraction-v2");

function listFixtureBases() {
  return fs
    .readdirSync(fixturesDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""));
}

function assertEvidenceMatchesTranscript(transcript, evidenceMap) {
  Object.entries(evidenceMap).forEach(([field, items]) => {
    if (!Array.isArray(items)) {
      return;
    }
    items.forEach((item) => {
      if (Number.isInteger(item.start_char) && Number.isInteger(item.end_char)) {
        const slice = transcript.slice(item.start_char, item.end_char);
        assert.equal(
          slice,
          item.text,
          `Evidence text mismatch for ${field}: expected '${item.text}' got '${slice}'`
        );
      }
    });
  });
}

test("extraction v2 fixtures validate schema and evidence", () => {
  const bases = listFixtureBases();
  assert.ok(bases.length > 0, "Expected extraction fixtures");

  bases.forEach((base) => {
    const transcriptPath = path.join(fixturesDir, `${base}.txt`);
    const payloadPath = path.join(fixturesDir, `${base}.json`);

    const transcript = fs.readFileSync(transcriptPath, "utf8");
    const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));

    const schemaResult = validatePayload(schemaPath, payload);
    assert.equal(
      schemaResult.ok,
      true,
      `Schema validation failed for ${base}: ${JSON.stringify(schemaResult.errors)}`
    );

    const evidenceResult = validateExtractionEvidence(payload);
    assert.equal(
      evidenceResult.ok,
      true,
      `Evidence validation failed for ${base}: ${JSON.stringify(evidenceResult.errors)}`
    );

    assertEvidenceMatchesTranscript(transcript, payload.evidence || {});
  });
});
