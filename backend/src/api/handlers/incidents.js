const {
  listIncidents,
  getIncidentById,
  listIncidentMembers
} = require("../../db/queries/incidents");
const { getCallById } = require("../../db/queries/calls");
const { getLatestGroupingDecisionForCall } = require("../../db/queries/grouping_decisions");
const { listSummariesForIncident } = require("../../db/queries/summaries");
const { listRollupsForIncident } = require("../../db/queries/rollups");
const { parseListFilters } = require("./filters");
const {
  buildConfidenceSignal,
  summarizeLinkReason
} = require("../../services/confidence");

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

  const lastActivityAt =
    incident.last_activity_at ||
    incident.last_call_at ||
    incident.last_rollup_at ||
    incident.updated_at ||
    null;
  const confidenceSignal = buildConfidenceSignal({
    confidence: incident.group_confidence ?? null
  });
  const pending = !incident.last_rollup_at && (incident.member_count ?? 0) > 0;
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
    updated_at: incident.updated_at ?? null,
    last_activity_at: lastActivityAt,
    pending,
    confidence_signal: confidenceSignal
  };
}

function normalizeIncidentMember(member, confidenceSignal) {
  return {
    call_id: member.call_id ?? member.callId,
    link_reason: member.link_reason ?? member.linkReason ?? null,
    link_confidence: member.link_confidence ?? null,
    created_at: member.created_at ?? null,
    confidence_signal: confidenceSignal ?? null
  };
}

function normalizeCallMember(call, { confidenceSignal } = {}) {
  const progressState =
    call.progress_state ?? (call.incident_id ? "grouped" : "pending_incident");
  return {
    call_id: call.call_id,
    status: call.status,
    first_seen_at: call.first_seen_at,
    agency: call.agency_name ?? null,
    service_type: call.service_type ?? null,
    incident_id: call.incident_id ?? null,
    progress_state: progressState,
    confidence_signal: confidenceSignal ?? null
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
  const confidenceByCall = new Map(
    members.map((member) => {
      const decision = getLatestGroupingDecisionForCall(db, member.call_id);
      const confidenceSignal = buildConfidenceSignal({
        confidence: member.link_confidence ?? decision?.confidence ?? null,
        requiresReview: decision?.requires_review ?? false,
        reasonLabel: summarizeLinkReason(member.link_reason)
      });
      return [member.call_id, confidenceSignal];
    })
  );
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
    members: members.map((member) =>
      normalizeIncidentMember(member, confidenceByCall.get(member.call_id))
    ),
    member_calls: memberCalls.map((call) =>
      normalizeCallMember(
        { ...call, progress_state: "grouped" },
        { confidenceSignal: confidenceByCall.get(call.call_id) }
      )
    ),
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
