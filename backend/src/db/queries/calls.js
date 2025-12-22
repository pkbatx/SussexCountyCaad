function getCallById(db, callId) {
  return db
    .prepare("SELECT * FROM calls WHERE call_id = ?")
    .get(callId);
}

function listCalls(
  db,
  {
    status,
    limit = 50,
    offset = 0,
    q,
    start,
    end,
    incidentType,
    jurisdiction,
    minConfidence,
    agency
  } = {}
) {
  const clauses = [];
  const params = [];
  if (status && status !== "any") {
    clauses.push("status = ?");
    params.push(status);
  }
  if (q) {
    clauses.push("source_path LIKE ?");
    params.push(`%${q}%`);
  }
  if (start) {
    clauses.push("calls.first_seen_at >= ?");
    params.push(start);
  }
  if (end) {
    clauses.push("calls.first_seen_at <= ?");
    params.push(end);
  }
  if (incidentType) {
    clauses.push("json_extract(meta.payload_json, '$.incident_type') = ?");
    params.push(incidentType);
  }
  if (jurisdiction) {
    clauses.push("json_extract(meta.payload_json, '$.jurisdiction') = ?");
    params.push(jurisdiction);
  }
  if (agency) {
    if (String(agency).toLowerCase() === "unknown") {
      clauses.push("(calls.agency_name IS NULL OR calls.agency_name = '')");
    } else {
      clauses.push("calls.agency_name = ?");
      params.push(agency);
    }
  }
  if (typeof minConfidence === "number") {
    clauses.push("COALESCE(gd.confidence, 0) >= ?");
    params.push(minConfidence);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const items = db
    .prepare(
      `SELECT calls.*, calls.agency_name as agency, json_extract(meta.payload_json, '$.incident_type') as incident_type, COALESCE(json_extract(meta.payload_json, '$.city'), json_extract(meta.payload_json, '$.jurisdiction')) as town, json_extract(meta.payload_json, '$.address_normalized') as address, COALESCE(json_extract(meta.payload_json, '$.cross_street_1'), json_extract(meta.payload_json, '$.cross_street_2')) as cross_street, json_extract(meta.payload_json, '$.landmark') as poi, summary.summary_text as summary FROM calls LEFT JOIN metadata_extracts meta ON meta.call_id = calls.call_id AND meta.created_at = (SELECT MAX(created_at) FROM metadata_extracts WHERE call_id = calls.call_id) LEFT JOIN grouping_decisions gd ON gd.call_id = calls.call_id AND gd.created_at = (SELECT MAX(created_at) FROM grouping_decisions WHERE call_id = calls.call_id) LEFT JOIN summaries summary ON summary.subject_type = 'call' AND summary.subject_id = calls.call_id AND summary.version = (SELECT MAX(version) FROM summaries WHERE subject_id = calls.call_id AND subject_type = 'call') ${where} ORDER BY calls.first_seen_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
  const total = db
    .prepare(
      `SELECT COUNT(1) as count FROM calls LEFT JOIN metadata_extracts meta ON meta.call_id = calls.call_id AND meta.created_at = (SELECT MAX(created_at) FROM metadata_extracts WHERE call_id = calls.call_id) LEFT JOIN grouping_decisions gd ON gd.call_id = calls.call_id AND gd.created_at = (SELECT MAX(created_at) FROM grouping_decisions WHERE call_id = calls.call_id) ${where}`
    )
    .get(...params).count;
  return { items, total };
}

function createCall(db, call) {
  const now = new Date().toISOString();
  const existing = getCallById(db, call.callId);
  if (existing) {
    return existing;
  }
  db.prepare(
    "INSERT INTO calls (call_id, source_path, file_size_bytes, audio_format, first_seen_at, status, duplicate_of_call_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    call.callId,
    call.sourcePath,
    call.fileSizeBytes ?? null,
    call.audioFormat ?? null,
    now,
    call.status || "pending",
    call.duplicateOfCallId ?? null,
    now,
    now
  );
  return getCallById(db, call.callId);
}

function updateCallStatus(db, callId, status) {
  db.prepare(
    "UPDATE calls SET status = ?, updated_at = ? WHERE call_id = ?"
  ).run(status, new Date().toISOString(), callId);
}

module.exports = {
  getCallById,
  listCalls,
  createCall,
  updateCallStatus
};
