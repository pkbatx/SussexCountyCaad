const {
  listIncidents,
  getIncidentById,
  listIncidentMembers
} = require("../../db/queries/incidents");
const { getCallById } = require("../../db/queries/calls");
const { listSummariesForIncident } = require("../../db/queries/summaries");
const { listRollupsForIncident } = require("../../db/queries/rollups");
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
    agency: filters.agency,
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
  const summaries = listSummariesForIncident(db, incidentId);
  const rollups = listRollupsForIncident(db, incidentId);
  const latestRollup = rollups[0] || null;
  const keyFields = latestRollup?.key_fields || {};
  const operatorFields = {
    agency: keyFields.agency || null,
    incident_type: keyFields.incident_type || null,
    address: keyFields.address || null,
    town: keyFields.town || null,
    cross_street: keyFields.cross_street || null,
    poi: keyFields.poi || null,
    summary: latestRollup?.summary_text || null
  };

  sendJson(res, 200, {
    incident,
    members,
    member_calls: memberCalls,
    summaries,
    rollups,
    operator_fields: operatorFields,
    notifications: []
  });
}

module.exports = {
  listIncidentsHandler,
  incidentDetailHandler
};
