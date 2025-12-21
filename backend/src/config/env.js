function parseBool(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }
  return value === "true" || value === "1" || value === "yes";
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

let dotenvLoaded = false;

function loadDotEnv() {
  if (dotenvLoaded) {
    return;
  }
  dotenvLoaded = true;

  try {
    const fs = require("fs");
    const path = require("path");
    const dotenv = require("dotenv");
    const repoEnv = path.resolve(__dirname, "..", "..", "..", ".env");
    const localEnv = path.resolve(__dirname, "..", "..", ".env");

    if (fs.existsSync(repoEnv)) {
      dotenv.config({ path: repoEnv });
    } else if (fs.existsSync(localEnv)) {
      dotenv.config({ path: localEnv });
    }
  } catch (error) {
    // Ignore dotenv load failures; env vars may already be set.
  }
}

function loadConfig() {
  loadDotEnv();
  return {
    callsDir: requireEnv("CALLS_DIR"),
    dbPath: requireEnv("CAAD_DB_PATH"),
    apiPort: Number(process.env.API_PORT || 3000),
    notifyEnabled: parseBool(process.env.NOTIFY_ENABLED, false),
    openaiApiKey: process.env.OPENAI_API_KEY || null,
    openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    groupingWindowMinutes: Number(process.env.GROUPING_WINDOW_MINUTES || 120),
    groupingMaxCandidates: Number(process.env.GROUPING_MAX_CANDIDATES || 20),
    groupingConfidenceThreshold: Number(
      process.env.GROUPING_CONFIDENCE_THRESHOLD || 0.7
    ),
    groupmeBotId: process.env.GROUPME_BOT_ID || null,
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || null
  };
}

module.exports = {
  loadConfig
};
