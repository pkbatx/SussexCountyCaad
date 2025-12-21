const { listMetadataForCall } = require("../../db/queries/metadata");
const { createLocationCandidate } = require("../../db/queries/locations");

async function runStage({ db, callId }) {
  const extracts = listMetadataForCall(db, callId);
  if (!extracts.length) {
    return;
  }

  const v2Extract = extracts.find(
    (item) => item.schema_version === "extraction.v2"
  );
  const payload = v2Extract ? JSON.parse(v2Extract.payload_json) : null;
  const legacy = !payload ? JSON.parse(extracts[0].payload_json) : null;

  let rawText = null;
  let confidence = null;

  if (payload) {
    rawText = payload.address_raw || payload.landmark || payload.address_normalized;
    if (payload.address_raw && payload.field_confidence) {
      confidence = payload.field_confidence.address_raw ?? null;
    } else if (payload.landmark && payload.field_confidence) {
      confidence = payload.field_confidence.landmark ?? null;
    } else if (payload.address_normalized && payload.field_confidence) {
      confidence = payload.field_confidence.address_normalized ?? null;
    }
  } else if (legacy?.fields?.locationText?.value) {
    rawText = legacy.fields.locationText.value;
    confidence = legacy.fields.locationText.confidence ?? null;
  }

  if (!rawText) {
    return;
  }

  createLocationCandidate(db, {
    subjectType: "call",
    subjectId: callId,
    rawText,
    normalizedText: null,
    geocodeJson: null,
    confidence
  });
}

module.exports = {
  runStage
};
