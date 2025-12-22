const crypto = require("crypto");

function normalizeKey(value) {
  if (!value) {
    return "";
  }
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function parseAliases(value) {
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

function findAgencyByCanonical(db, canonicalName) {
  if (!canonicalName) {
    return null;
  }
  return db
    .prepare("SELECT * FROM agency_registry WHERE canonical_name = ?")
    .get(canonicalName);
}

function upsertAgency(db, { canonicalName, serviceType, aliases = [] } = {}) {
  if (!canonicalName) {
    return null;
  }
  const now = new Date().toISOString();
  const existing = findAgencyByCanonical(db, canonicalName);
  const mergedAliases = Array.from(
    new Set([...(existing ? parseAliases(existing.aliases_json) : []), ...aliases])
  ).filter(Boolean);

  if (existing) {
    db.prepare(
      "UPDATE agency_registry SET service_type = ?, aliases_json = ?, last_seen_at = ?, updated_at = ? WHERE agency_id = ?"
    ).run(
      serviceType ?? existing.service_type ?? null,
      JSON.stringify(mergedAliases),
      now,
      now,
      existing.agency_id
    );
    return {
      ...existing,
      service_type: serviceType ?? existing.service_type ?? null,
      aliases: mergedAliases,
      last_seen_at: now,
      updated_at: now
    };
  }

  const agencyId = crypto.randomUUID();
  db.prepare(
    "INSERT INTO agency_registry (agency_id, canonical_name, service_type, aliases_json, last_seen_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    agencyId,
    canonicalName,
    serviceType ?? null,
    JSON.stringify(mergedAliases),
    now,
    now,
    now
  );
  return {
    agency_id: agencyId,
    canonical_name: canonicalName,
    service_type: serviceType ?? null,
    aliases: mergedAliases,
    last_seen_at: now,
    created_at: now,
    updated_at: now
  };
}

function setCallAgency(db, { callId, agencyId, agencyName, serviceType } = {}) {
  if (!callId) {
    return;
  }
  db.prepare(
    "UPDATE calls SET agency_id = ?, agency_name = ?, agency_service_type = ?, updated_at = ? WHERE call_id = ?"
  ).run(
    agencyId ?? null,
    agencyName ?? null,
    serviceType ?? null,
    new Date().toISOString(),
    callId
  );
}

function listAgencies(db, { q, limit = 200 } = {}) {
  const search = q ? `%${normalizeKey(q)}%` : null;
  const rows = db
    .prepare(
      "SELECT * FROM agency_registry WHERE (? IS NULL OR UPPER(canonical_name) LIKE ?) ORDER BY canonical_name ASC LIMIT ?"
    )
    .all(search, search, limit);
  return rows.map((row) => ({
    ...row,
    aliases: parseAliases(row.aliases_json)
  }));
}

function cleanupAgencies(db, { retentionDays } = {}) {
  const days = Number(retentionDays);
  if (!Number.isFinite(days) || days <= 0) {
    return 0;
  }
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const result = db
    .prepare(
      "DELETE FROM agency_registry WHERE last_seen_at IS NOT NULL AND last_seen_at < ?"
    )
    .run(cutoff);
  return result.changes || 0;
}

module.exports = {
  normalizeKey,
  upsertAgency,
  listAgencies,
  cleanupAgencies,
  setCallAgency
};
