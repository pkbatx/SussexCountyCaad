const {
  listIncidents,
  getIncidentById,
  listIncidentMembers
} = require("../../db/queries/incidents");
const { getCallById } = require("../../db/queries/calls");
const { listGroupingDecisionsForIncident } = require("../../db/queries/grouping_decisions");
const { listSummariesForIncident } = require("../../db/queries/summaries");
const { listRollupsForIncident } = require("../../db/queries/rollups");
const { listLocationsForSubject } = require("../../db/queries/locations");
const { parseListFilters } = require("./filters");

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

async function listIncidentsHandler(req, res, { db }) {
  const filters = parseListFilters(req);
  const result = listIncidents(db, {
    limit: filters.limit,
    offset: filters.offset,
    start: filters.start,
    end: filters.end,
    incidentType: filters.incidentType,
    jurisdiction: filters.jurisdiction,
    status: filters.status,
    minConfidence: filters.minConfidence
  });
  sendJson(res, 200, result);
}

async function incidentDetailHandler(req, res, { db, incidentId }) {
  const incident = getIncidentById(db, incidentId);
  if (!incident) {
    return sendJson(res, 404, { error: "incident_not_found" });
  }

  const members = listIncidentMembers(db, incidentId);
  const memberCalls = members
    .map((member) => getCallById(db, member.call_id))
    .filter(Boolean);
  const groupingDecisions = listGroupingDecisionsForIncident(db, incidentId);
  const summaries = listSummariesForIncident(db, incidentId);
  const rollups = listRollupsForIncident(db, incidentId);
  const locations = listLocationsForSubject(db, {
    subjectType: "incident",
    subjectId: incidentId
  });

  sendJson(res, 200, {
    incident,
    members,
    member_calls: memberCalls,
    grouping_decisions: groupingDecisions,
    summaries,
    rollups,
    locations,
    notifications: []
  });
}

module.exports = {
  listIncidentsHandler,
  incidentDetailHandler
};
