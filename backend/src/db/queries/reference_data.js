function listReferenceCandidates(db, { refType, query, limit = 10 } = {}) {
  const search = query ? `%${String(query).toLowerCase()}%` : null;
  const rows = db
    .prepare(
      "SELECT * FROM reference_data WHERE ref_type = ? AND active = 1 AND (? IS NULL OR LOWER(canonical_name) LIKE ? OR LOWER(aliases_json) LIKE ?) ORDER BY canonical_name ASC LIMIT ?"
    )
    .all(refType, search, search, search, limit);

  return rows.map((row) => ({
    ...row,
    aliases: row.aliases_json ? JSON.parse(row.aliases_json) : []
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
  findReferenceCandidatesForText
};
