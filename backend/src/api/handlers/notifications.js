const { listNotifications } = require("../../db/queries/notifications");

function parseUrl(req) {
  return new URL(req.url, `http://${req.headers.host}`);
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

async function listNotificationsHandler(req, res, { db }) {
  const url = parseUrl(req);
  const subjectType = url.searchParams.get("subjectType") || undefined;
  const subjectId = url.searchParams.get("subjectId") || undefined;
  const items = listNotifications(db, { subjectType, subjectId });
  sendJson(res, 200, { items, total: items.length });
}

module.exports = {
  listNotificationsHandler
};
