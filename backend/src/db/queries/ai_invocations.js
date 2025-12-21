const crypto = require("crypto");

function createAIInvocation(db, invocation) {
  const invocationId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO ai_invocations (invocation_id, call_id, stage_name, provider, model, request_json, response_json, token_usage, latency_ms, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    invocationId,
    invocation.callId,
    invocation.stageName,
    invocation.provider,
    invocation.model ?? null,
    JSON.stringify(invocation.requestJson || {}),
    JSON.stringify(invocation.responseJson || {}),
    invocation.tokenUsage ? JSON.stringify(invocation.tokenUsage) : null,
    invocation.latencyMs ?? null,
    invocation.status,
    createdAt
  );
  return invocationId;
}

module.exports = {
  createAIInvocation
};
