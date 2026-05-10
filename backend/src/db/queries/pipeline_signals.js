const crypto = require("crypto");

const VALID_SIGNALS = new Set(["ok", "needs_review", "ambiguous", "retry_grouping"]);

function createSignal(db, { callId, stage, signal, reason }) {
  if (!VALID_SIGNALS.has(signal)) {
    throw new Error(`Invalid pipeline signal: ${signal}`);
  }
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO pipeline_signals (id, call_id, stage, signal, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, callId, stage, signal, reason || null, new Date().toISOString());
  return id;
}

function listSignals(db, { callId, stage, signal, limit, offset } = {}) {
  const where = [];
  const params = [];
  if (callId) {
    where.push("call_id = ?");
    params.push(callId);
  }
  if (stage) {
    where.push("stage = ?");
    params.push(stage);
  }
  if (signal) {
    where.push("signal = ?");
    params.push(signal);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const lim = Number.isFinite(limit) ? Math.min(limit, 500) : 100;
  const off = Number.isFinite(offset) ? Math.max(offset, 0) : 0;
  return db
    .prepare(
      `SELECT id, call_id, stage, signal, reason, created_at
       FROM pipeline_signals
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, lim, off);
}

function listSignalsForCalls(db, callIds) {
  if (!Array.isArray(callIds) || callIds.length === 0) {
    return [];
  }
  const placeholders = callIds.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT id, call_id, stage, signal, reason, created_at
       FROM pipeline_signals
       WHERE call_id IN (${placeholders})
       ORDER BY created_at DESC`
    )
    .all(...callIds);
}

module.exports = {
  createSignal,
  listSignals,
  listSignalsForCalls
};
