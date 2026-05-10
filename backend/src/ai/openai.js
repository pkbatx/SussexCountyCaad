const fs = require("fs");
const path = require("path");
const { Blob } = require("buffer");

const OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

async function requestJsonCompletion({ config, systemPrompt, userPrompt }) {
  if (!config.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is required for JSON completion");
  }

  const startedAt = Date.now();
  const response = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.openaiModel || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0
    })
  });

  const latencyMs = Date.now() - startedAt;
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error?.message || "OpenAI JSON completion failed");
  }

  const content = json.choices?.[0]?.message?.content;
  return {
    content,
    model: json.model,
    usage: json.usage ?? null,
    latencyMs
  };
}

async function transcribe({ config, filePath, prompt, language }) {
  if (!config.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is required for transcription");
  }

  const buffer = fs.readFileSync(filePath);
  const blob = new Blob([buffer]);
  const form = new FormData();
  form.append("file", blob, path.basename(filePath));
  const model = config.openaiTranscriptionModel || "gpt-4o-transcribe";
  form.append("model", model);
  if (prompt) {
    form.append("prompt", prompt);
  }
  if (language) {
    form.append("language", language);
  }

  const startedAt = Date.now();
  const response = await fetch(OPENAI_TRANSCRIBE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`
    },
    body: form
  });

  const latencyMs = Date.now() - startedAt;
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error?.message || "OpenAI transcription failed");
  }

  return {
    text: json.text,
    model,
    usage: json.usage ?? null,
    latencyMs
  };
}

async function extractMetadata({ config, prompt }) {
  return requestJsonCompletion({
    config,
    systemPrompt:
      "You extract structured incident metadata. Respond with strict JSON only. Use extraction.v2.",
    userPrompt: prompt
  });
}

async function groupIncident({ config, prompt }) {
  return requestJsonCompletion({
    config,
    systemPrompt:
      "You determine incident grouping. Respond with strict JSON only. Use grouping.v2.",
    userPrompt: prompt
  });
}

async function summarizeDigest({ config, prompt }) {
  return requestJsonCompletion({
    config,
    systemPrompt:
      "You generate concise operational digest lines from provided counts. Respond with strict JSON only as {\"lines\": [\"Town — Fire 3, EMS 2 (Agency 2, Other 1)\"]}. Use only provided data and omit zero-count categories.",
    userPrompt: `Input JSON:\n${prompt}\n\nRules:\n- Use only towns and counts provided.\n- Format each line as \"Town — Fire X, EMS Y, Special Z\".\n- If agency_breakdown is provided for a town, append \"(Agency A N, Agency B M)\" after the service counts.\n- Omit categories with 0 counts.\n- Return at most max_lines.\n- Output JSON only with key \"lines\".`
  });
}

async function summarizeTranscriptDigest({ config, prompt }) {
  return requestJsonCompletion({
    config,
    systemPrompt:
      "You generate concise operational digest lines grounded in radio transcripts. Respond with strict JSON only as {\"lines\": [\"Agency — dispatch summary\"]}. Use only details explicitly present in transcript snippets or provided fields.",
    userPrompt:
      `Input JSON:\n${prompt}\n\nRules:\n` +
      "- Each line must be grounded in the provided transcript snippets.\n" +
      "- Do not invent towns, addresses, or incident types.\n" +
      "- Keep lines short and operational; prefer dispatch phrasing.\n" +
      "- If a field like agency, town, or address is present, you may include it.\n" +
      "- Return at most max_lines.\n" +
      "- Output JSON only with key \"lines\"."
  });
}

module.exports = {
  transcribe,
  extractMetadata,
  groupIncident,
  summarizeDigest,
  summarizeTranscriptDigest,
  async embedTexts({ config, input, model }) {
    if (!config.openaiApiKey) {
      throw new Error("OPENAI_API_KEY is required for embeddings");
    }
    const startedAt = Date.now();
    const response = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model || config.openaiEmbeddingsModel || "text-embedding-3-small",
        input
      })
    });
    const latencyMs = Date.now() - startedAt;
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error?.message || "OpenAI embeddings failed");
    }
    return {
      embeddings: (json.data || []).map((item) => item.embedding),
      model: json.model,
      usage: json.usage ?? null,
      latencyMs
    };
  }
};
