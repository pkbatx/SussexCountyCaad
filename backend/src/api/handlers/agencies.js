const { listAgencies } = require("../../db/queries/agencies");

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

async function listAgenciesHandler(req, res, { db }) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const q = url.searchParams.get("q") || undefined;
  const agencies = listAgencies(db, { q });
  const payload = agencies.map((agency) => ({
    agency_id: agency.agency_id,
    canonical_name: agency.canonical_name,
    service_type: agency.service_type,
    last_seen_at: agency.last_seen_at
  }));
  sendJson(res, 200, payload);
}

module.exports = {
  listAgenciesHandler
};
