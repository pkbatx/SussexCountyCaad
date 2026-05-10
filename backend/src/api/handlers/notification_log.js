const { listNotificationLog } = require("../../db/queries/notification_log");

function listNotificationLogHandler(req, res, { db }) {
  const url = new URL(req.url, "http://localhost");
  const channel = url.searchParams.get("channel") || undefined;
  const limit = Number(url.searchParams.get("limit") || 50);
  const offset = Number(url.searchParams.get("offset") || 0);
  const rows = listNotificationLog(db, { channel, limit, offset });

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ entries: rows, limit, offset }));
}

module.exports = {
  listNotificationLogHandler
};
