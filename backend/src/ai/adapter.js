function createAIAdapter({ config }) {
  return {
    async transcribe(payload) {
      const client = require("./openai");
      return client.transcribe({ config, ...payload });
    },
    async extractMetadata(payload) {
      const client = require("./openai");
      return client.extractMetadata({ config, ...payload });
    },
    async groupIncident(payload) {
      const client = require("./openai");
      return client.groupIncident({ config, ...payload });
    },
    async embedTexts(payload) {
      const client = require("./openai");
      return client.embedTexts({ config, ...payload });
    }
  };
}

module.exports = {
  createAIAdapter
};
