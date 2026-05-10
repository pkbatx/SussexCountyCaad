const fs = require("fs");
const path = require("path");
const { Blob } = require("buffer");

const OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

async function complete({ config, systemPrompt, userPrompt }) {
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
    latencyMs,
    provider: "openai"
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

async function embedTexts({ config, input, model }) {
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

module.exports = {
  complete,
  transcribe,
  embedTexts
};
