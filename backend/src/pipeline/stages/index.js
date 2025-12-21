const path = require("path");

const stageModuleMap = {
  transcription: "./transcription",
  extraction: "./extraction",
  summary: "./call-summary",
  grouping: "./grouping",
  geo: "./geo",
  notification: "./notification",
  incidentSummary: "./incident-summary"
};

function getStageHandler(stageName) {
  const modulePath = stageModuleMap[stageName];
  if (!modulePath) {
    return null;
  }
  try {
    // Lazy require to avoid loading stages before they exist.
    const handler = require(modulePath);
    return handler.runStage || null;
  } catch (error) {
    return null;
  }
}

module.exports = {
  getStageHandler
};
