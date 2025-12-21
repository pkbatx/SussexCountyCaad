function normalizeKey(value) {
  if (!value) {
    return "";
  }
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function listReferenceCandidates(db, { refType, query, limit = 10 } = {}) {
  const normalized = query ? normalizeKey(query) : null;
  const search = normalized ? `%${normalized}%` : null;
  const lower = query ? `%${String(query).toLowerCase()}%` : null;
  const rows = db
    .prepare(
      "SELECT * FROM reference_data WHERE ref_type = ? AND active = 1 AND (? IS NULL OR normalized_key LIKE ? OR LOWER(canonical_name) LIKE ? OR LOWER(aliases_json) LIKE ? OR LOWER(raw_address) LIKE ?) ORDER BY canonical_name ASC LIMIT ?"
    )
    .all(refType, search, search, lower, lower, lower, limit);

  return rows.map((row) => ({
    ...row,
    aliases: row.aliases_json ? JSON.parse(row.aliases_json) : [],
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {}
  }));
}

function tokenize(text) {
  if (!text) {
    return [];
  }
  return Array.from(
    new Set(
      String(text)
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 3)
    )
  );
}

function findReferenceCandidatesForText(db, { text, limitPerType = 10 } = {}) {
  const tokens = tokenize(text);
  const types = ["street", "town", "poi"];
  const results = {};

  types.forEach((type) => {
    const collected = new Map();
    tokens.forEach((token) => {
      if (collected.size >= limitPerType) {
        return;
      }
      const matches = listReferenceCandidates(db, {
        refType: type,
        query: token,
        limit: limitPerType
      });
      matches.forEach((match) => {
        if (collected.size < limitPerType) {
          collected.set(match.reference_id, match);
        }
      });
    });
    results[type] = Array.from(collected.values());
  });

  return results;
}

module.exports = {
  listReferenceCandidates,
  findReferenceCandidatesForText,
  normalizeKey
};
