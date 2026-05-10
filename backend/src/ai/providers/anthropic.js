// Anthropic provider. Audio and embeddings are not supported here — the
// adapter routes those directly to the OpenAI provider. Structured output
// uses the messages API with a single forced tool_use whose input_schema
// is the desired JSON schema; we return the tool call's input.

let cachedSdk = null;
function loadSdk() {
  if (cachedSdk) return cachedSdk;
  // eslint-disable-next-line global-require
  const Anthropic = require("@anthropic-ai/sdk");
  cachedSdk = Anthropic.default || Anthropic;
  return cachedSdk;
}

let cachedClient = null;
let cachedClientKey = null;
function getClient(config) {
  if (!config.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic");
  }
  if (cachedClient && cachedClientKey === config.anthropicApiKey) {
    return cachedClient;
  }
  const Anthropic = loadSdk();
  cachedClient = new Anthropic({ apiKey: config.anthropicApiKey });
  cachedClientKey = config.anthropicApiKey;
  return cachedClient;
}

// Anthropic's tool-schema validator rejects $schema / $ref / definitions
// that Ajv tolerates. Inline $refs and strip metadata before sending.
function inlineRefs(node, defs) {
  if (!node || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map((item) => inlineRefs(item, defs));
  if (typeof node.$ref === "string") {
    const match = node.$ref.match(/^#\/definitions\/(.+)$/);
    if (match && defs[match[1]]) return inlineRefs(defs[match[1]], defs);
    return node;
  }
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    out[key] = inlineRefs(value, defs);
  }
  return out;
}

function toolInputSchema(schema) {
  const defs = schema.definitions || {};
  const { $schema, definitions, ...rest } = inlineRefs(schema, defs);
  return rest;
}

async function complete({
  config,
  systemPrompt,
  userPrompt,
  schema,
  toolName = "structured_output"
}) {
  const client = getClient(config);
  const startedAt = Date.now();
  const response = await client.messages.create({
    model: config.anthropicModel || "claude-sonnet-4-6",
    max_tokens: 4096,
    temperature: 0,
    system: systemPrompt,
    tools: [
      {
        name: toolName,
        description:
          "Return the structured payload for the operator. Always call this tool exactly once.",
        input_schema: schema ? toolInputSchema(schema) : { type: "object" }
      }
    ],
    tool_choice: { type: "tool", name: toolName },
    messages: [{ role: "user", content: userPrompt }]
  });
  const latencyMs = Date.now() - startedAt;

  const block = (response.content || []).find(
    (c) => c.type === "tool_use" && c.name === toolName
  );
  if (!block) throw new Error("Anthropic response missing tool_use block");

  return {
    content: JSON.stringify(block.input),
    parsed: block.input,
    model: response.model,
    usage: response.usage || null,
    latencyMs,
    provider: "anthropic"
  };
}

module.exports = { complete };
