const fs = require("fs");
const path = require("path");
const { Blob } = require("buffer");

const OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

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

async function transcribe({ config, filePath }) {
  if (!config.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is required for transcription");
  }

  const buffer = fs.readFileSync(filePath);
  const blob = new Blob([buffer]);
  const form = new FormData();
  form.append("file", blob, path.basename(filePath));
  form.append("model", "whisper-1");

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
    model: "whisper-1",
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

module.exports = {
  transcribe,
  extractMetadata,
  groupIncident
};
