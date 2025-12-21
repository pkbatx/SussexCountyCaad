const { createAIAdapter } = require("../../ai/adapter");
const { getCallById } = require("../../db/queries/calls");
const { createTranscript } = require("../../db/queries/transcripts");
const { createAIInvocation } = require("../../db/queries/ai_invocations");
const { extractFilenameHints } = require("../filename-hints");

function buildTranscriptionPrompt({ filenameHints, config }) {
  const lines = [
    "Transcribe Sussex County, NJ radio audio.",
    "Prioritize addresses, cross streets, towns, agencies, incident type, and unit identifiers."
  ];

  const townCandidates = (filenameHints?.townCandidates || []).slice(
    0,
    config.transcriptionHintMaxCandidates
  );
  if (townCandidates.length) {
    lines.push(`Possible towns: ${townCandidates.join(", ")}.`);
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
  const prompt = buildTranscriptionPrompt({ filenameHints, config });
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
  runStage
};
