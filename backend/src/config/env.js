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

function parseList(value) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
    openaiTranscriptionModel:
      process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-transcribe",
    transcriptionHintMaxCandidates: Number(
      process.env.TRANSCRIPTION_HINT_MAX_CANDIDATES || 8
    ),
    groupingWindowMinutes: Number(process.env.GROUPING_WINDOW_MINUTES || 120),
    groupingMaxCandidates: Number(process.env.GROUPING_MAX_CANDIDATES || 20),
    groupingMaxSignals: Number(process.env.GROUPING_MAX_SIGNALS || 4),
    groupingConfidenceThreshold: Number(
      process.env.GROUPING_CONFIDENCE_THRESHOLD || 0.7
    ),
    referencePoiPath: process.env.REFERENCE_POI_PATH || null,
    referenceStreetTownsPath: process.env.REFERENCE_STREET_TOWNS_PATH || null,
    referenceDataMaxCandidates: Number(
      process.env.REFERENCE_DATA_MAX_CANDIDATES || 10
    ),
    referenceAmbiguousAgencies: parseList(
      process.env.REFERENCE_AMBIGUOUS_AGENCIES || "Lakeland,Tri-Pod,Blue Ridge"
    ),
    feedbackConfidencePenalty: Number(
      process.env.FEEDBACK_CONFIDENCE_PENALTY || 0.05
    ),
    feedbackMaxPenalty: Number(process.env.FEEDBACK_MAX_PENALTY || 0.2),
    mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN || null,
    mapboxGeocodeBbox: process.env.MAPBOX_GEOCODE_BBOX || null,
    mapboxGeocodeLimit: Number(process.env.MAPBOX_GEOCODE_LIMIT || 5),
    mapboxGeocodeTypes:
      process.env.MAPBOX_GEOCODE_TYPES || "address,poi,place",
    notifyIncidentDedupeWindowSeconds: Number(
      process.env.NOTIFY_INCIDENT_DEDUPE_WINDOW_SECONDS || 900
    ),
    groupmeBotId: process.env.GROUPME_BOT_ID || null,
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || null
  };
}

module.exports = {
  loadConfig
};
