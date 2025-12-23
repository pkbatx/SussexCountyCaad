const crypto = require("crypto");

function createIncidentGroup(db, { incidentId, normalizedAddress, incidentIdentifiers, groupConfidence }) {
  const id = incidentId || crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO incident_groups (incident_id, normalized_address, incident_identifiers, group_confidence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    normalizedAddress ?? null,
    incidentIdentifiers ? JSON.stringify(incidentIdentifiers) : null,
    groupConfidence ?? 0,
    now,
    now
  );
  return id;
}

function addIncidentMember(db, { incidentId, callId, linkReason, linkConfidence }) {
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT OR IGNORE INTO incident_group_members (incident_id, call_id, link_reason, link_confidence, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(incidentId, callId, linkReason, linkConfidence ?? 0, createdAt);
}

function listIncidents(
  db,
  {
    limit = 50,
    offset = 0,
    start,
    end,
    incidentType,
    jurisdiction,
    status,
    minConfidence,
    agency,
    serviceType
  } = {}
) {
  const clauses = [];
  const params = [];
  if (start) {
    clauses.push("COALESCE(rollups.created_at, incident_groups.updated_at) >= ?");
    params.push(start);
  }
  if (end) {
    clauses.push("COALESCE(rollups.created_at, incident_groups.updated_at) <= ?");
    params.push(end);
  }
  if (incidentType) {
    clauses.push("json_extract(rollups.key_fields_json, '$.incident_type') = ?");
    params.push(incidentType);
  }
  if (jurisdiction) {
    clauses.push("json_extract(rollups.key_fields_json, '$.jurisdiction') = ?");
    params.push(jurisdiction);
  }
  if (agency) {
    const agencies = Array.isArray(agency) ? agency : [agency];
    const normalized = agencies.map((value) => String(value).trim()).filter(Boolean);
    const unknownRequested = normalized.some(
      (value) => value.toLowerCase() === "unknown"
    );
    const named = normalized.filter((value) => value.toLowerCase() !== "unknown");
    const parts = [];
    if (named.length) {
      parts.push(
        `json_extract(rollups.key_fields_json, '$.agency') IN (${named
          .map(() => "?")
          .join(", ")})`
      );
      params.push(...named);
    }
    if (unknownRequested) {
      parts.push(
        "(json_extract(rollups.key_fields_json, '$.agency') IS NULL OR json_extract(rollups.key_fields_json, '$.agency') = '')"
      );
    }
    if (parts.length) {
      clauses.push(`(${parts.join(" OR ")})`);
    }
  }
  if (serviceType) {
    const types = Array.isArray(serviceType) ? serviceType : [serviceType];
    const normalized = types.map((value) => String(value).trim()).filter(Boolean);
    const unknownRequested = normalized.some(
      (value) => value.toLowerCase() === "unknown"
    );
    const named = normalized.filter((value) => value.toLowerCase() !== "unknown");
    const parts = [];
    if (named.length) {
      parts.push(`agency_registry.service_type IN (${named.map(() => "?").join(", ")})`);
      params.push(...named);
    }
    if (unknownRequested) {
      parts.push(
        "(agency_registry.service_type IS NULL OR agency_registry.service_type = '')"
      );
    }
    if (parts.length) {
      clauses.push(`(${parts.join(" OR ")})`);
    }
  }
  if (status && status !== "any") {
    clauses.push("json_extract(rollups.key_fields_json, '$.status') = ?");
    params.push(status);
  }
  if (typeof minConfidence === "number") {
    clauses.push("COALESCE(incident_groups.group_confidence, 0) >= ?");
    params.push(minConfidence);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const items = db
    .prepare(
      "SELECT incident_groups.*, rollups.summary_text as latest_summary, rollups.created_at as last_rollup_at, rollups.version as latest_rollup_version, json_extract(rollups.key_fields_json, '$.agency') as agency, json_extract(rollups.key_fields_json, '$.incident_type') as incident_type, json_extract(rollups.key_fields_json, '$.address') as address, json_extract(rollups.key_fields_json, '$.town') as town, json_extract(rollups.key_fields_json, '$.cross_street') as cross_street, json_extract(rollups.key_fields_json, '$.poi') as poi, json_extract(rollups.key_fields_json, '$.jurisdiction') as jurisdiction, json_extract(rollups.key_fields_json, '$.status') as status, GROUP_CONCAT(DISTINCT agency_registry.canonical_name) as agency_list, COALESCE(incident_groups.call_count, COUNT(DISTINCT incident_group_members.call_id)) as member_count, incident_groups.re_alert_count as re_alert_count, MAX(calls.first_seen_at) as last_call_at FROM incident_groups LEFT JOIN incident_group_members ON incident_groups.incident_id = incident_group_members.incident_id LEFT JOIN calls ON calls.call_id = incident_group_members.call_id LEFT JOIN incident_agency_stats ON incident_agency_stats.incident_id = incident_groups.incident_id LEFT JOIN agency_registry ON agency_registry.agency_id = incident_agency_stats.agency_id LEFT JOIN incident_rollups rollups ON rollups.incident_id = incident_groups.incident_id AND rollups.version = (SELECT MAX(version) FROM incident_rollups WHERE incident_id = incident_groups.incident_id) " +
        `${where} GROUP BY incident_groups.incident_id ORDER BY COALESCE(rollups.created_at, last_call_at, incident_groups.updated_at) DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
  const total = db
    .prepare(
      "SELECT COUNT(DISTINCT incident_groups.incident_id) as count FROM incident_groups LEFT JOIN incident_rollups rollups ON rollups.incident_id = incident_groups.incident_id AND rollups.version = (SELECT MAX(version) FROM incident_rollups WHERE incident_id = incident_groups.incident_id) LEFT JOIN incident_agency_stats ON incident_agency_stats.incident_id = incident_groups.incident_id LEFT JOIN agency_registry ON agency_registry.agency_id = incident_agency_stats.agency_id " +
        where
    )
    .get(...params).count;
  return { items, total };
}

function getIncidentById(db, incidentId) {
  return db
    .prepare("SELECT * FROM incident_groups WHERE incident_id = ?")
    .get(incidentId);
}

function listIncidentMembers(db, incidentId) {
  return db
    .prepare(
      "SELECT * FROM incident_group_members WHERE incident_id = ? ORDER BY created_at DESC"
    )
    .all(incidentId);
}

function parseIdentifiers(value) {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function listCandidateIncidents(
  db,
  { windowStart, limit = 20, addressTokens = [], incidentId } = {}
) {
  const fetchLimit = Math.max(limit * 5, limit);
  const rows = db
    .prepare(
      "SELECT incident_groups.*, COUNT(incident_group_members.call_id) as member_count FROM incident_groups LEFT JOIN incident_group_members ON incident_groups.incident_id = incident_group_members.incident_id WHERE incident_groups.updated_at >= ? GROUP BY incident_groups.incident_id ORDER BY incident_groups.updated_at DESC LIMIT ?"
    )
    .all(windowStart, fetchLimit);

  const tokens = addressTokens
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  const filtered = rows.filter((row) => {
    if (incidentId) {
      if (row.incident_id === incidentId) {
        return true;
      }
      const identifiers = parseIdentifiers(row.incident_identifiers);
      if (identifiers.includes(incidentId)) {
        return true;
      }
    }

    if (!tokens.length) {
      return true;
    }

    const address = (row.normalized_address || "").toLowerCase();
    return tokens.some((token) => address.includes(token));
  });

  return filtered.slice(0, limit).map((row) => ({
    ...row,
    incident_identifiers: parseIdentifiers(row.incident_identifiers)
  }));
}

module.exports = {
  createIncidentGroup,
  addIncidentMember,
  listIncidents,
  getIncidentById,
  listIncidentMembers,
  listCandidateIncidents
};
