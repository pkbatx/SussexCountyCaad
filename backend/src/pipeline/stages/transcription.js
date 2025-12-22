const { createAIAdapter } = require("../../ai/adapter");
const { getCallById } = require("../../db/queries/calls");
const { createTranscript } = require("../../db/queries/transcripts");
const { createAIInvocation } = require("../../db/queries/ai_invocations");
const { recordUnitMentions } = require("../../db/queries/units");
const { extractFilenameHints } = require("../filename-hints");
const { normalizeAgency, getAgencyCoverageTowns } = require("../agency-normalizer");
const { extractUnitCandidates } = require("../unit-normalizer");

function buildTranscriptionPrompt({ filenameHints, config, agencyCoverageTowns, agencyName }) {
  const lines = [
    "Transcribe Sussex County, NJ radio audio.",
    "Prioritize addresses, cross streets, towns, agencies, incident type, and unit identifiers."
  ];

  if (agencyName) {
    lines.push(`Agency name from filename: ${agencyName}.`);
  }

  const coverageTowns = (agencyCoverageTowns || []).slice(
    0,
    config.transcriptionHintMaxCandidates
  );
  const townCandidates = (filenameHints?.townCandidates || []).slice(
    0,
    config.transcriptionHintMaxCandidates
  );
  const townList = Array.from(
    new Set([...coverageTowns, ...townCandidates].filter(Boolean))
  ).slice(0, config.transcriptionHintMaxCandidates);
  if (townList.length) {
    lines.push(`Town spellings (use exact): ${townList.join(", ")}.`);
  }

  const agencyTokens = (filenameHints?.agencyTokens || []).slice(
    0,
    config.transcriptionHintMaxCandidates
  );
  if (agencyTokens.length) {
    lines.push(`Possible agencies: ${agencyTokens.join(", ")}.`);
  }

  const ambiguous = (filenameHints?.ambiguousAgencies || []).slice(
    0,
    config.transcriptionHintMaxCandidates
  );
  if (ambiguous.length) {
    lines.push(
      `Ambiguous agency names (not locations): ${ambiguous.join(", ")}.`
    );
  }

  return lines.join(" ");
}

async function runStage({ config, db, callId, runId, pipeline }) {
  const call = getCallById(db, callId);
  if (!call) {
    throw new Error(`Call not found: ${callId}`);
  }

  const adapter = createAIAdapter({ config });
  const filenameHints = extractFilenameHints({
    db,
    sourcePath: call.source_path,
    config
  });
  const agencyGuess = normalizeAgency({
    sourcePath: call.source_path,
    filenameHints
  });
  const agencyCoverageTowns = getAgencyCoverageTowns(agencyGuess.agency);
  const prompt = buildTranscriptionPrompt({
    filenameHints,
    config,
    agencyCoverageTowns,
    agencyName: agencyGuess.agency
  });
  const requestPayload = { filePath: call.source_path, prompt };

  try {
    const result = await adapter.transcribe(requestPayload);
    createTranscript(db, {
      callId,
      runId,
      text: result.text,
      language: result.language ?? null,
      confidence: result.confidence ?? null
    });

    const unitCandidates = extractUnitCandidates(result.text);
    if (unitCandidates.length) {
      recordUnitMentions(db, {
        callId,
        agencyId: null,
        agencyName: agencyGuess.agency,
        unitMentions: unitCandidates
      });
    }

    createAIInvocation(db, {
      callId,
      stageName: "transcription",
      provider: "openai",
      model: result.model,
      requestJson: requestPayload,
      responseJson: { text: result.text },
      tokenUsage: result.usage,
      latencyMs: result.latencyMs,
      status: "succeeded"
    });

    if (pipeline?.enqueue) {
      pipeline.enqueue(callId, "extraction");
      pipeline.enqueue(callId, "summary");
    }
  } catch (error) {
    createAIInvocation(db, {
      callId,
      stageName: "transcription",
      provider: "openai",
      model: config.openaiTranscriptionModel || "gpt-4o-transcribe",
      requestJson: requestPayload,
      responseJson: { error: error.message },
      tokenUsage: null,
      latencyMs: null,
      status: "failed"
    });
    throw error;
  }
}

module.exports = {
  runStage,
  buildTranscriptionPrompt
};
