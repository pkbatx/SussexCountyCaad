// Anthropic provider. Audio transcription delegates to OpenAI — Anthropic
// does not expose an audio API. Structured output uses the messages API
// with a single forced tool_use whose input_schema is the desired JSON
// schema; we extract the tool call and return its input as the model output.

const openai = require("./openai");

let cachedSdk = null;
function loadSdk() {
  if (cachedSdk) return cachedSdk;
  // Lazy require so consumers that only use OpenAI don't pay the import cost
  // and don't need @anthropic-ai/sdk installed at all.
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

// Anthropic tool input_schema is a draft-7 JSON schema, but its validator
// rejects $schema, definitions $refs, and a few other extras Ajv tolerates.
// Inline $refs and strip metadata so the schema is self-contained.
function inlineRefs(node, defs) {
  if (!node || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map((item) => inlineRefs(item, defs));
  if (typeof node.$ref === "string") {
    const ref = node.$ref;
    const match = ref.match(/^#\/definitions\/(.+)$/);
    if (match && defs[match[1]]) {
      return inlineRefs(defs[match[1]], defs);
    }
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
  const inlined = inlineRefs(schema, defs);
  const { $schema, definitions, ...rest } = inlined;
  if (rest.type !== "object") {
    return { type: "object", ...rest };
  }
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
  const model = config.anthropicModel || "claude-sonnet-4-6";

  const tool = {
    name: toolName,
    description:
      "Return the structured payload for the operator. Always call this tool exactly once.",
    input_schema: schema ? toolInputSchema(schema) : { type: "object" }
  };

  const startedAt = Date.now();
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    temperature: 0,
    system: systemPrompt,
    tools: [tool],
    tool_choice: { type: "tool", name: toolName },
    messages: [{ role: "user", content: userPrompt }]
  });
  const latencyMs = Date.now() - startedAt;

  const block = (response.content || []).find(
    (c) => c.type === "tool_use" && c.name === toolName
  );
  if (!block) {
    throw new Error("Anthropic response missing tool_use block");
  }

  return {
    content: JSON.stringify(block.input),
    parsed: block.input,
    model: response.model,
    usage: response.usage || null,
    latencyMs,
    provider: "anthropic"
  };
}

async function transcribe(payload) {
  // Anthropic has no audio API. Always use OpenAI for transcription.
  return openai.transcribe(payload);
}

async function embedTexts(payload) {
  // Anthropic has no embeddings API. Always use OpenAI for embeddings.
  return openai.embedTexts(payload);
}

module.exports = {
  complete,
  transcribe,
  embedTexts
};
