function applyReAlert({ db, callId, incidentId, agencyId, occurredAt, windowMinutes = 7 } = {}) {
  if (!db || !callId || !incidentId || !agencyId || !occurredAt) {
    return { isReAlert: false, reason: "missing_data" };
  }

  const windowMs = Number(windowMinutes) * 60 * 1000;
  const occurredAtMs = new Date(occurredAt).getTime();
  if (!Number.isFinite(occurredAtMs) || !Number.isFinite(windowMs)) {
    return { isReAlert: false, reason: "invalid_time" };
  }

  const windowStart = new Date(occurredAtMs - windowMs).toISOString();

  const prior = db
    .prepare(
      "SELECT COUNT(1) as count FROM incident_group_members igm JOIN calls ON igm.call_id = calls.call_id WHERE igm.incident_id = ? AND calls.agency_id = ? AND calls.first_seen_at >= ? AND calls.first_seen_at < ? AND calls.call_id != ?"
    )
    .get(incidentId, agencyId, windowStart, occurredAt, callId).count;

  const isReAlert = prior > 0;
  db.prepare("UPDATE calls SET re_alert_flag = ?, updated_at = ? WHERE call_id = ?").run(
    isReAlert ? 1 : 0,
    new Date().toISOString(),
    callId
  );

  const callCount = db
    .prepare(
      "SELECT COUNT(1) as count FROM incident_group_members igm JOIN calls ON igm.call_id = calls.call_id WHERE igm.incident_id = ? AND calls.agency_id = ?"
    )
    .get(incidentId, agencyId).count;

  const reAlertCount = db
    .prepare(
      "SELECT COUNT(1) as count FROM incident_group_members igm JOIN calls ON igm.call_id = calls.call_id WHERE igm.incident_id = ? AND calls.agency_id = ? AND calls.re_alert_flag = 1"
    )
    .get(incidentId, agencyId).count;

  db.prepare(
    "INSERT INTO incident_agency_stats (incident_id, agency_id, call_count, re_alert_count, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(incident_id, agency_id) DO UPDATE SET call_count = excluded.call_count, re_alert_count = excluded.re_alert_count, updated_at = excluded.updated_at"
  ).run(incidentId, agencyId, callCount, reAlertCount, new Date().toISOString());

  const incidentCallCount = db
    .prepare(
      "SELECT COUNT(1) as count FROM incident_group_members WHERE incident_id = ?"
    )
    .get(incidentId).count;

  const incidentReAlertCount = db
    .prepare(
      "SELECT COUNT(1) as count FROM incident_group_members igm JOIN calls ON igm.call_id = calls.call_id WHERE igm.incident_id = ? AND calls.re_alert_flag = 1"
    )
    .get(incidentId).count;

  db.prepare(
    "UPDATE incident_groups SET call_count = ?, re_alert_count = ?, updated_at = ? WHERE incident_id = ?"
  ).run(incidentCallCount, incidentReAlertCount, new Date().toISOString(), incidentId);

  return { isReAlert, reason: isReAlert ? "window_match" : "no_match" };
}

module.exports = {
  applyReAlert
};
