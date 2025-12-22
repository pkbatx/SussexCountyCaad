const { listIncidentMembers, getIncidentById } = require("../../db/queries/incidents");
const { listGroupingDecisionsForIncident } = require("../../db/queries/grouping_decisions");
const { createIncidentRollup } = require("../../db/queries/rollups");
const { listLocationsForSubject } = require("../../db/queries/locations");
const { listReferenceCandidates } = require("../../db/queries/reference_data");
const { extractTownFromGeocode, normalizeTownQuery } = require("../../geo/town-utils");

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

function getLatestIncidentFields(db, incidentId) {
  const row = db
    .prepare(
      "SELECT calls.call_id, calls.agency_name, calls.agency_service_type, meta.payload_json FROM incident_group_members JOIN calls ON calls.call_id = incident_group_members.call_id JOIN metadata_extracts meta ON meta.call_id = incident_group_members.call_id WHERE incident_group_members.incident_id = ? AND meta.schema_version = 'extraction.v2' ORDER BY meta.created_at DESC LIMIT 1"
    )
    .get(incidentId);

  if (!row) {
    return { callId: null, agency: null, payload: null };
  }

  let payload = null;
  try {
    payload = JSON.parse(row.payload_json);
  } catch (_error) {
    payload = null;
  }

  return {
    callId: row.call_id || null,
    agency: row.agency_name || null,
    agencyServiceType: row.agency_service_type || null,
    payload
  };
}

function resolveTownFallback(db, callId) {
  if (!callId) {
    return null;
  }
  const locations = listLocationsForSubject(db, { subjectType: "call", subjectId: callId });
  if (!locations.length) {
    return null;
  }
  const town = extractTownFromGeocode(locations[0]?.geocode_json);
  const normalized = normalizeTownQuery(town);
  if (!normalized) {
    return null;
  }
  const matches = listReferenceCandidates(db, {
    refType: "town",
    query: normalized,
    limit: 1
  });
  return matches[0]?.canonical_name || null;
}

function buildHeadline({ agency, incidentType, address, town, crossStreet, poi }) {
  const parts = [];
  if (agency) {
    parts.push(agency);
  }
  if (incidentType) {
    parts.push(incidentType);
  }
  const locationParts = [];
  if (address) {
    locationParts.push(address);
  }
  if (town) {
    locationParts.push(town);
  }
  let location = locationParts.join(", ");
  if (crossStreet) {
    location = location ? `${location} @ ${crossStreet}` : crossStreet;
  }
  if (!location && poi) {
    location = poi;
  }
  if (location) {
    parts.push(location);
  }
  return parts.join(" · ").trim();
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
  const latestFields = getLatestIncidentFields(db, incidentId);
  const payload = latestFields.payload || {};
  const address = payload.address_normalized || payload.address_raw || null;
  const town =
    payload.city ||
    payload.jurisdiction ||
    resolveTownFallback(db, latestFields.callId);
  const crossStreet = payload.cross_street_1 || payload.cross_street_2 || null;
  const poi = payload.landmark || null;
  const headline = buildHeadline({
    agency: latestFields.agency,
    incidentType: payload.incident_type || null,
    address,
    town,
    crossStreet,
    poi
  });
  const keyFields = {
    agency: latestFields.agency,
    incident_type: payload.incident_type || null,
    address,
    town,
    cross_street: crossStreet,
    poi,
    grouping_decision: latestDecision
      ? {
          decision: latestDecision.decision,
          confidence: latestDecision.confidence,
          requires_review: latestDecision.requires_review
        }
      : null
  };
  const openQuestions = [];
  if (!address) {
    openQuestions.push("Location unclear");
  }
  if (!latestFields.agency) {
    openQuestions.push("Agency unknown");
  }
  if (latestDecision?.requires_review) {
    openQuestions.push("Grouping decision needs review");
  }

  createIncidentRollup(db, {
    incidentId,
    runId,
    summaryText: headline || combined,
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
