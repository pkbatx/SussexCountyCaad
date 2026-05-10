const fs = require("fs");
const path = require("path");

const SCHEMA_DIR = path.join(__dirname, "schema");
const schemaCache = new Map();

function loadSchema(name) {
  if (!schemaCache.has(name)) {
    schemaCache.set(name, JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, `${name}.json`), "utf8")));
  }
  return schemaCache.get(name);
}

const DIGEST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { lines: { type: "array", items: { type: "string" } } },
  required: ["lines"]
};

function getProvider(config) {
  const name = (config.aiProvider || "anthropic").toLowerCase();
  if (name === "openai") return require("./providers/openai");
  if (name === "anthropic") return require("./providers/anthropic");
  throw new Error(`Unknown AI_PROVIDER: ${name}`);
}

function createAIAdapter({ config }) {
  // Audio + embeddings always go through OpenAI; Anthropic exposes neither.
  const openai = require("./providers/openai");
  return {
    async transcribe(payload) {
      return openai.transcribe({ config, ...payload });
    },
    async embedTexts(payload) {
      return openai.embedTexts({ config, ...payload });
    },
    async extractMetadata({ prompt }) {
      return getProvider(config).complete({
        config,
        systemPrompt:
          "You extract structured incident metadata. Respond with strict JSON only. Use extraction.v2.",
        userPrompt: prompt,
        schema: loadSchema("metadata"),
        toolName: "extract_incident_metadata"
      });
    },
    async groupIncident({ prompt }) {
      return getProvider(config).complete({
        config,
        systemPrompt:
          "You determine incident grouping. Respond with strict JSON only. Use grouping.v2.",
        userPrompt: prompt,
        schema: loadSchema("grouping"),
        toolName: "group_incident"
      });
    },
    async summarizeDigest({ prompt }) {
      return getProvider(config).complete({
        config,
        systemPrompt:
          'You generate concise operational digest lines from provided counts. Respond with strict JSON only as {"lines": ["Town — Fire 3, EMS 2 (Agency 2, Other 1)"]}. Use only provided data and omit zero-count categories.',
        userPrompt:
          `Input JSON:\n${prompt}\n\nRules:\n- Use only towns and counts provided.\n- Format each line as "Town — Fire X, EMS Y, Special Z".\n- If agency_breakdown is provided for a town, append "(Agency A N, Agency B M)" after the service counts.\n- Omit categories with 0 counts.\n- Return at most max_lines.\n- Output JSON only with key "lines".`,
        schema: DIGEST_SCHEMA,
        toolName: "emit_digest_lines"
      });
    },
    async summarizeTranscriptDigest({ prompt }) {
      return getProvider(config).complete({
        config,
        systemPrompt:
          'You generate concise operational digest lines grounded in radio transcripts. Respond with strict JSON only as {"lines": ["Agency — dispatch summary"]}. Use only details explicitly present in transcript snippets or provided fields.',
        userPrompt:
          `Input JSON:\n${prompt}\n\nRules:\n` +
          "- Each line must be grounded in the provided transcript snippets.\n" +
          "- Do not invent towns, addresses, or incident types.\n" +
          "- Keep lines short and operational; prefer dispatch phrasing.\n" +
          "- If a field like agency, town, or address is present, you may include it.\n" +
          "- Return at most max_lines.\n" +
          '- Output JSON only with key "lines".',
        schema: DIGEST_SCHEMA,
        toolName: "emit_transcript_digest_lines"
      });
    }
  };
}

module.exports = { createAIAdapter };
