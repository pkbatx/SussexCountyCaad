const { listSignals } = require("../../db/queries/pipeline_signals");

function listSignalsHandler(req, res, { db }) {
  const url = new URL(req.url, "http://localhost");
  const callId = url.searchParams.get("call_id") || undefined;
  const stage = url.searchParams.get("stage") || undefined;
  const signal = url.searchParams.get("signal") || undefined;
  const limit = Number(url.searchParams.get("limit") || 100);
  const offset = Number(url.searchParams.get("offset") || 0);

  const rows = listSignals(db, { callId, stage, signal, limit, offset });

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ signals: rows, limit, offset }));
}

module.exports = {
  listSignalsHandler
};
