const { findRecentNotification } = require("../db/queries/notifications");

function shouldSend({ db, dedupeKey, windowSeconds }) {
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const existing = findRecentNotification(db, dedupeKey, windowStart);
  return !existing;
}

module.exports = {
  shouldSend
};
