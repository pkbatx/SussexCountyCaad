const { getCallById } = require("../db/queries/calls");

function validateIdempotency(db, callId) {
  const existing = getCallById(db, callId);
  if (existing) {
    return { ok: false, existing };
  }
  return { ok: true };
}

module.exports = {
  validateIdempotency
};
