const { listMetadataForCall } = require("../../db/queries/metadata");
const { getLatestRollupForIncident } = require("../../db/queries/rollups");
const { listFeedbackSignals, createFeedbackSignal } = require("../../db/queries/feedback");
const { getLatestGroupingDecisionForCall } = require("../../db/queries/grouping_decisions");

function getIncidentForCall(db, callId) {
  return db
    .prepare(
      "SELECT incident_id FROM incident_group_members WHERE call_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .get(callId)?.incident_id;
}

function normalize(value) {
  if (!value) {
    return "";
  }
  return String(value).toLowerCase().trim();
}

function addressMismatch(rollupAddress, extractionAddress) {
  const left = normalize(rollupAddress);
  const right = normalize(extractionAddress);
  if (!left || !right) {
    return false;
  }
  return !(left.includes(right) || right.includes(left));
}

async function runStage({ config, db, callId }) {
  const incidentId = getIncidentForCall(db, callId);
  if (!incidentId) {
    return;
  }

  const rollup = getLatestRollupForIncident(db, incidentId);
  if (!rollup) {
    return;
  }

  const extracts = listMetadataForCall(db, callId).filter(
    (item) => item.schema_version === "extraction.v2"
  );
  if (!extracts.length) {
    return;
  }

  let extraction = null;
  try {
    extraction = JSON.parse(extracts[0].payload_json);
  } catch (_error) {
    return;
  }

  const existing = listFeedbackSignals(db, {
    callId,
    signalType: "contradiction"
  });
  if (existing.length) {
    return;
  }

  const rollupAddress = rollup.key_fields?.address || null;
  const extractionAddress =
    extraction.address_normalized || extraction.address_raw || null;

  if (addressMismatch(rollupAddress, extractionAddress)) {
    const latestDecision = getLatestGroupingDecisionForCall(db, callId);
    createFeedbackSignal(db, {
      incidentId,
      callId,
      priorDecisionId: latestDecision?.decision_id || null,
      signalType: "contradiction",
      details: {
        field: "address",
        prior_value: rollupAddress,
        new_value: extractionAddress
      },
      adjustment: {
        confidence_penalty: config.feedbackConfidencePenalty,
        max_penalty: config.feedbackMaxPenalty
      }
    });
  }
}

module.exports = {
  runStage
};
