// Backwards-compat shim. The OpenAI logic moved to ./providers/openai
// during the AI provider abstraction refactor. The previous module
// exposed transcribe/extractMetadata/groupIncident/summarizeDigest/
// summarizeTranscriptDigest/embedTexts; only transcribe/embedTexts remain
// because the JSON-completion methods are now provider-dispatched via
// ai/adapter.js. Anything that needs the old per-method shape should go
// through the adapter instead.

const provider = require("./providers/openai");

module.exports = {
  transcribe: provider.transcribe,
  embedTexts: provider.embedTexts
};
