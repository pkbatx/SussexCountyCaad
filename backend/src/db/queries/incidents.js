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

function listIncidents(db, { limit = 50, offset = 0 } = {}) {
  const items = db
    .prepare(
      "SELECT incident_groups.*, rollups.summary_text as latest_summary, rollups.created_at as last_rollup_at, rollups.version as latest_rollup_version, COUNT(incident_group_members.call_id) as member_count FROM incident_groups LEFT JOIN incident_group_members ON incident_groups.incident_id = incident_group_members.incident_id LEFT JOIN incident_rollups rollups ON rollups.incident_id = incident_groups.incident_id AND rollups.version = (SELECT MAX(version) FROM incident_rollups WHERE incident_id = incident_groups.incident_id) GROUP BY incident_groups.incident_id ORDER BY COALESCE(rollups.created_at, incident_groups.updated_at) DESC LIMIT ? OFFSET ?"
    )
    .all(limit, offset);
  const total = db
    .prepare("SELECT COUNT(1) as count FROM incident_groups")
    .get().count;
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
