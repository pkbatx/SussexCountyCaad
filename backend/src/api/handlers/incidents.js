const {
  listIncidents,
  getIncidentById,
  listIncidentMembers
} = require("../../db/queries/incidents");
const { listSummariesForIncident } = require("../../db/queries/summaries");
const { listRollupsForIncident } = require("../../db/queries/rollups");
const { listLocationsForSubject } = require("../../db/queries/locations");

function parseUrl(req) {
  return new URL(req.url, `http://${req.headers.host}`);
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

async function listIncidentsHandler(req, res, { db }) {
  const url = parseUrl(req);
  const limit = Number(url.searchParams.get("limit") || 50);
  const offset = Number(url.searchParams.get("offset") || 0);
  const result = listIncidents(db, { limit, offset });
  sendJson(res, 200, result);
}

async function incidentDetailHandler(req, res, { db, incidentId }) {
  const incident = getIncidentById(db, incidentId);
  if (!incident) {
    return sendJson(res, 404, { error: "incident_not_found" });
  }

  const members = listIncidentMembers(db, incidentId);
  const summaries = listSummariesForIncident(db, incidentId);
  const rollups = listRollupsForIncident(db, incidentId);
  const locations = listLocationsForSubject(db, {
    subjectType: "incident",
    subjectId: incidentId
  });

  sendJson(res, 200, {
    incident,
    members,
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
