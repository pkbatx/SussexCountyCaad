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

function normalizeIncidentListItem(incident) {
  const agencyListRaw =
    incident.agencies ??
    incident.agency_list ??
    incident.agencyList ??
    incident.agency_list_json ??
    null;
  const agencies = Array.isArray(agencyListRaw)
    ? agencyListRaw
    : typeof agencyListRaw === "string"
    ? agencyListRaw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  return {
    incident_id: incident.incident_id,
    agency: incident.agency ?? null,
    agencies,
    incident_type: incident.incident_type ?? null,
    address: incident.address ?? null,
    town: incident.town ?? null,
    cross_street: incident.cross_street ?? null,
    poi: incident.poi ?? null,
    status: incident.status ?? null,
    member_count: incident.member_count ?? 0,
    re_alert_count: incident.re_alert_count ?? 0,
    latest_summary: incident.latest_summary ?? null,
    last_rollup_at: incident.last_rollup_at ?? null,
    updated_at: incident.updated_at ?? null
  };
}

function normalizeIncidentMember(member) {
  return {
    call_id: member.call_id ?? member.callId,
    link_reason: member.link_reason ?? member.linkReason ?? null,
    created_at: member.created_at ?? null
  };
}

function normalizeCallMember(call) {
  return {
    call_id: call.call_id,
    status: call.status,
    first_seen_at: call.first_seen_at,
    agency: call.agency_name ?? null,
    service_type: call.service_type ?? null
  };
}

function normalizeRollup(rollup) {
  return {
    rollup_id: rollup.rollup_id,
    incident_id: rollup.incident_id,
    version: rollup.version,
    created_at: rollup.created_at,
    summary_text: rollup.summary_text,
    latest_update: rollup.latest_update ?? [],
    key_fields: rollup.key_fields ?? {}
  };
}

function normalizeSummary(summary) {
  return {
    summary_id: summary.summary_id,
    summary_text: summary.summary_text,
    created_at: summary.created_at,
    version: summary.version
  };
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
    serviceType: filters.serviceType,
    status: filters.status,
    minConfidence: filters.minConfidence
  });
  const items = result.items.map(normalizeIncidentListItem);
  sendJson(res, 200, { items, total: result.total });
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
  const agencyList = Array.from(
    new Set(memberCalls.map((call) => call?.agency_name).filter(Boolean))
  );
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

  const incidentView = normalizeIncidentListItem({
    ...incident,
    agency: operatorFields.agency,
    agencies: agencyList,
    incident_type: operatorFields.incident_type,
    address: operatorFields.address,
    town: operatorFields.town,
    cross_street: operatorFields.cross_street,
    poi: operatorFields.poi,
    status: incident.status ?? null,
    member_count: incident.call_count ?? incident.member_count ?? 0,
    re_alert_count: incident.re_alert_count ?? 0,
    latest_summary: latestRollup?.summary_text ?? null,
    last_rollup_at: latestRollup?.created_at ?? null
  });

  sendJson(res, 200, {
    incident: incidentView,
    members: members.map(normalizeIncidentMember),
    member_calls: memberCalls.map(normalizeCallMember),
    summaries: summaries.map(normalizeSummary),
    rollups: rollups.map(normalizeRollup),
    operator_fields: operatorFields,
    notifications: []
  });
}

module.exports = {
  listIncidentsHandler,
  incidentDetailHandler
};
