const crypto = require("crypto");

function createLocationCandidate(db, { subjectType, subjectId, rawText, normalizedText, geocodeJson, confidence }) {
  const locationId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO location_candidates (location_id, subject_type, subject_id, raw_text, normalized_text, geocode_json, confidence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    locationId,
    subjectType,
    subjectId,
    rawText,
    normalizedText ?? null,
    geocodeJson ? JSON.stringify(geocodeJson) : null,
    confidence ?? null,
    createdAt
  );
  return locationId;
}

function listLocationsForSubject(db, { subjectType, subjectId }) {
  return db
    .prepare(
      "SELECT * FROM location_candidates WHERE subject_type = ? AND subject_id = ? ORDER BY created_at DESC"
    )
    .all(subjectType, subjectId);
}

module.exports = {
  createLocationCandidate,
  listLocationsForSubject
};
