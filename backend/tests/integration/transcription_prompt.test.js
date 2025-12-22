const test = require("node:test");
const assert = require("node:assert/strict");
const { buildTranscriptionPrompt } = require("../../src/pipeline/stages/transcription");

test("transcription prompt includes agency and coverage towns", () => {
  const prompt = buildTranscriptionPrompt({
    filenameHints: {
      townCandidates: ["Hopatcong"]
    },
    config: { transcriptionHintMaxCandidates: 5 },
    agencyCoverageTowns: ["Hopatcong", "Sparta"],
    agencyName: "Hopatcong FD"
  });

  assert.ok(prompt.includes("Agency name from filename: Hopatcong FD."));
  assert.ok(prompt.includes("Town spellings (use exact): Hopatcong, Sparta."));
});
