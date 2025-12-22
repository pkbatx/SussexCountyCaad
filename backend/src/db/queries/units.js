const crypto = require("crypto");
const { normalizeKey } = require("./reference_data");

function buildUnitKey({ unitLabel, agencyName }) {
  const scope = agencyName ? normalizeKey(agencyName) : "unknown";
  return normalizeKey(`${scope}:${unitLabel}`);
}

function getUnitByKey(db, unitKey) {
  return db
    .prepare(
      "SELECT unit_id, total_mentions, first_seen_at FROM unit_registry WHERE unit_key = ?"
    )
    .get(unitKey);
}

function upsertUnit(db, { unitLabel, agencyId, agencyName, increment = true }) {
  const now = new Date().toISOString();
  const unitKey = buildUnitKey({ unitLabel, agencyName });
  const existing = getUnitByKey(db, unitKey);

  if (existing) {
    const total = increment
      ? (existing.total_mentions || 0) + 1
      : existing.total_mentions || 0;
    db.prepare(
      "UPDATE unit_registry SET last_seen_at = ?, total_mentions = ?, updated_at = ? WHERE unit_id = ?"
    ).run(now, total, now, existing.unit_id);
    return { unit_id: existing.unit_id };
  }

  const unitId = crypto.randomUUID();
  db.prepare(
    "INSERT INTO unit_registry (unit_id, unit_key, unit_label, agency_id, agency_name, aliases_json, first_seen_at, last_seen_at, total_mentions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    unitId,
    unitKey,
    unitLabel,
    agencyId || null,
    agencyName || null,
    "[]",
    now,
    now,
    1,
    now,
    now
  );

  return { unit_id: unitId };
}

function recordUnitMentions(db, { callId, agencyId, agencyName, unitMentions }) {
  if (!Array.isArray(unitMentions) || unitMentions.length === 0) {
    return [];
  }
  const now = new Date().toISOString();
  return unitMentions.map((mention) => {
    const unitKey = buildUnitKey({
      unitLabel: mention.unit,
      agencyName
    });
    const existingUnit = getUnitByKey(db, unitKey);
    if (existingUnit) {
      const existingMention = db
        .prepare(
          "SELECT mention_id FROM unit_mentions WHERE call_id = ? AND unit_id = ?"
        )
        .get(callId, existingUnit.unit_id);
      if (existingMention) {
        return { unit_id: existingUnit.unit_id, mention_id: existingMention.mention_id };
      }
    }
    const entry = upsertUnit(db, {
      unitLabel: mention.unit,
      agencyId,
      agencyName,
      increment: true
    });
    const mentionId = crypto.randomUUID();
    db.prepare(
      "INSERT INTO unit_mentions (mention_id, unit_id, call_id, observed_text, start_char, end_char, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      mentionId,
      entry.unit_id,
      callId,
      mention.evidence?.text || null,
      Number.isInteger(mention.evidence?.start_char) ? mention.evidence.start_char : null,
      Number.isInteger(mention.evidence?.end_char) ? mention.evidence.end_char : null,
      now
    );
    return { unit_id: entry.unit_id, mention_id: mentionId };
  });
}

module.exports = {
  recordUnitMentions
};
