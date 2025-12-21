function getCallById(db, callId) {
  return db
    .prepare("SELECT * FROM calls WHERE call_id = ?")
    .get(callId);
}

function listCalls(db, { status, limit = 50, offset = 0, q } = {}) {
  const clauses = [];
  const params = [];
  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }
  if (q) {
    clauses.push("source_path LIKE ?");
    params.push(`%${q}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const items = db
    .prepare(
      `SELECT * FROM calls ${where} ORDER BY first_seen_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
  const total = db
    .prepare(`SELECT COUNT(1) as count FROM calls ${where}`)
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
