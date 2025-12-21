const { listIncidentMembers, getIncidentById } = require("../../db/queries/incidents");
const { listGroupingDecisionsForIncident } = require("../../db/queries/grouping_decisions");
const { createIncidentRollup } = require("../../db/queries/rollups");

function getIncidentForCall(db, callId) {
  return db
    .prepare(
      "SELECT incident_id FROM incident_group_members WHERE call_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .get(callId)?.incident_id;
}

function listCallSummariesForIncident(db, incidentId) {
  return db
    .prepare(
      "SELECT summaries.summary_text FROM summaries JOIN incident_group_members ON summaries.subject_id = incident_group_members.call_id WHERE summaries.subject_type = 'call' AND incident_group_members.incident_id = ? ORDER BY summaries.created_at DESC"
    )
    .all(incidentId);
}

async function runStage({ db, callId, runId, pipeline }) {
  const incidentId = getIncidentForCall(db, callId);
  if (!incidentId) {
    return;
  }

  const callSummaries = listCallSummariesForIncident(db, incidentId);
  if (!callSummaries.length) {
    return;
  }

  const combined = callSummaries
    .slice(0, 3)
    .map((row) => row.summary_text)
    .join(" \n");

  const members = listIncidentMembers(db, incidentId);
  const includedCallIds = members.map((member) => member.call_id);
  const incident = getIncidentById(db, incidentId);
  const decisions = listGroupingDecisionsForIncident(db, incidentId);
  const latestDecision = decisions[0] || null;
  const keyFields = {
    address: incident?.normalized_address || null,
    grouping_decision: latestDecision
      ? {
          decision: latestDecision.decision,
          confidence: latestDecision.confidence,
          requires_review: latestDecision.requires_review
        }
      : null
  };
  const openQuestions = [];
  if (!incident?.normalized_address) {
    openQuestions.push("Location unclear");
  }
  if (latestDecision?.requires_review) {
    openQuestions.push("Grouping decision needs review");
  }

  createIncidentRollup(db, {
    incidentId,
    runId,
    summaryText: combined,
    latestUpdate: callSummaries.slice(0, 2).map((row) => row.summary_text),
    keyFields,
    confidence: incident?.group_confidence ?? 0,
    openQuestions,
    includedCallIds
  });

  if (pipeline?.enqueue) {
    pipeline.enqueue(callId, "feedback");
  }
}

module.exports = {
  runStage
};
