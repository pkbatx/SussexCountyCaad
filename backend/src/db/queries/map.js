function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractLatLon(geocodeJson) {
  if (!geocodeJson) return null;
  const data = typeof geocodeJson === "string" ? JSON.parse(geocodeJson) : geocodeJson;
  const latitude = parseNumber(data.latitude ?? data.lat);
  const longitude = parseNumber(data.longitude ?? data.lon ?? data.lng);
  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
}

function withinBounds(point, bounds) {
  if (!bounds) return true;
  return (
    point.latitude >= bounds.minLat &&
    point.latitude <= bounds.maxLat &&
    point.longitude >= bounds.minLon &&
    point.longitude <= bounds.maxLon
  );
}

function computeWeight(timestamp, windowStart, windowEnd) {
  if (!timestamp || !windowStart || !windowEnd) return 0.6;
  const t = new Date(timestamp).getTime();
  const start = new Date(windowStart).getTime();
  const end = new Date(windowEnd).getTime();
  if (!Number.isFinite(t) || !Number.isFinite(start) || !Number.isFinite(end)) {
    return 0.6;
  }
  const span = Math.max(end - start, 1);
  const progress = Math.min(Math.max((t - start) / span, 0), 1);
  return 0.2 + progress * 0.8;
}

function listCallMapPoints(
  db,
  { start, end, minConfidence, incidentType, jurisdiction, status } = {}
) {
  const clauses = [];
  const params = [];
  if (start) {
    clauses.push("calls.first_seen_at >= ?");
    params.push(start);
  }
  if (end) {
    clauses.push("calls.first_seen_at <= ?");
    params.push(end);
  }
  if (status && status !== "any") {
    clauses.push("calls.status = ?");
    params.push(status);
  }
  if (incidentType) {
    clauses.push("json_extract(meta.payload_json, '$.incident_type') = ?");
    params.push(incidentType);
  }
  if (jurisdiction) {
    clauses.push("json_extract(meta.payload_json, '$.jurisdiction') = ?");
    params.push(jurisdiction);
  }
  if (typeof minConfidence === "number") {
    clauses.push("COALESCE(gd.confidence, 0) >= ?");
    params.push(minConfidence);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT calls.call_id, calls.first_seen_at, calls.status, locations.geocode_json, locations.confidence FROM calls LEFT JOIN metadata_extracts meta ON meta.call_id = calls.call_id AND meta.created_at = (SELECT MAX(created_at) FROM metadata_extracts WHERE call_id = calls.call_id) LEFT JOIN grouping_decisions gd ON gd.call_id = calls.call_id AND gd.created_at = (SELECT MAX(created_at) FROM grouping_decisions WHERE call_id = calls.call_id) LEFT JOIN location_candidates locations ON locations.subject_type = 'call' AND locations.subject_id = calls.call_id AND locations.created_at = (SELECT MAX(created_at) FROM location_candidates WHERE subject_type = 'call' AND subject_id = calls.call_id) ${where}`
    )
    .all(...params);

  return rows
    .map((row) => {
      const coords = extractLatLon(row.geocode_json);
      if (!coords) return null;
      return {
        entity_type: "call",
        entity_id: row.call_id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        weight: computeWeight(row.first_seen_at, start, end),
        updated_at: row.first_seen_at,
        status: row.status
      };
    })
    .filter(Boolean);
}

function listIncidentMapPoints(
  db,
  { start, end, minConfidence, incidentType, jurisdiction, status } = {}
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
  if (status && status !== "any") {
    clauses.push("json_extract(rollups.key_fields_json, '$.status') = ?");
    params.push(status);
  }
  if (typeof minConfidence === "number") {
    clauses.push("COALESCE(incident_groups.group_confidence, 0) >= ?");
    params.push(minConfidence);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT incident_groups.incident_id, incident_groups.updated_at, locations.geocode_json, locations.confidence FROM incident_groups LEFT JOIN incident_rollups rollups ON rollups.incident_id = incident_groups.incident_id AND rollups.version = (SELECT MAX(version) FROM incident_rollups WHERE incident_id = incident_groups.incident_id) LEFT JOIN location_candidates locations ON locations.subject_type = 'incident' AND locations.subject_id = incident_groups.incident_id AND locations.created_at = (SELECT MAX(created_at) FROM location_candidates WHERE subject_type = 'incident' AND subject_id = incident_groups.incident_id) ${where}`
    )
    .all(...params);

  return rows
    .map((row) => {
      const coords = extractLatLon(row.geocode_json);
      if (!coords) return null;
      return {
        entity_type: "incident",
        entity_id: row.incident_id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        weight: computeWeight(row.updated_at, start, end),
        updated_at: row.updated_at
      };
    })
    .filter(Boolean);
}

function listMapPoints(
  db,
  {
    entity = "both",
    start,
    end,
    minConfidence,
    incidentType,
    jurisdiction,
    status,
    bounds
  } = {}
) {
  const points = [];
  if (entity === "call" || entity === "both") {
    points.push(
      ...listCallMapPoints(db, {
        start,
        end,
        minConfidence,
        incidentType,
        jurisdiction,
        status
      })
    );
  }
  if (entity === "incident" || entity === "both") {
    points.push(
      ...listIncidentMapPoints(db, {
        start,
        end,
        minConfidence,
        incidentType,
        jurisdiction,
        status
      })
    );
  }
  return points.filter((point) => withinBounds(point, bounds));
}

module.exports = {
  listMapPoints
};
