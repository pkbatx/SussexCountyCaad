const { createAIAdapter } = require("../../ai/adapter");
const { getCallById } = require("../../db/queries/calls");
const { createTranscript } = require("../../db/queries/transcripts");
const { createAIInvocation } = require("../../db/queries/ai_invocations");

async function runStage({ config, db, callId, runId, pipeline }) {
  const call = getCallById(db, callId);
  if (!call) {
    throw new Error(`Call not found: ${callId}`);
  }

  const adapter = createAIAdapter({ config });
  const requestPayload = { filePath: call.source_path };

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
      model: "whisper-1",
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
