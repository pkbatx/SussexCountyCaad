const {
  listIncidentTimelineCalls,
  listIncidentTimelineTranscripts
} = require("../db/queries/timeline");
const { listRollupsForIncident } = require("../db/queries/rollups");

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function toTimestamp(value) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function buildSummaryStatements(rollups) {
  if (!rollups.length) return { updated_at: null, statements: [] };
  const latest = rollups[0];
  const rawUpdates =
    Array.isArray(latest.latest_update) && latest.latest_update.length
      ? latest.latest_update
      : latest.summary_text
      ? latest.summary_text.split("\n")
      : [];
  const statements = rawUpdates
    .map((text) => (text || "").trim())
    .filter(Boolean)
    .map((text, index) => ({
      statement_id: `rollup:${latest.rollup_id}:line:${index}`,
      rollup_id: latest.rollup_id,
      text,
      updated_at: latest.created_at,
      included_call_ids: latest.included_call_ids ?? []
    }));
  return { updated_at: latest.created_at, statements };
}

function getIncidentTimeline(db, incidentId) {
  const calls = listIncidentTimelineCalls(db, incidentId);
  const transcripts = listIncidentTimelineTranscripts(db, incidentId);
  const rollups = listRollupsForIncident(db, incidentId);

  const summaryCallIds = new Set(
    rollups[0]?.included_call_ids ? rollups[0].included_call_ids : []
  );
  const transcriptByCall = transcripts.reduce((acc, transcript) => {
    if (!acc.has(transcript.call_id)) {
      acc.set(transcript.call_id, []);
    }
    acc.get(transcript.call_id).push(transcript);
    return acc;
  }, new Map());

  const events = [];

  calls.forEach((call) => {
    const metadata = safeJsonParse(call.metadata_json, {});
    const transcriptCount = transcriptByCall.get(call.call_id)?.length ?? 0;
    const dispatchEventId = `dispatch:${call.call_id}`;
    const summaryContributor = summaryCallIds.has(call.call_id);
    const isClosed = ["succeeded", "failed"].includes(call.status);
    const basePayload = {
      call_id: call.call_id,
      agency: call.agency ?? null,
      service_type: call.service_type ?? null,
      incident_type: call.incident_type ?? null,
      address: call.address ?? null,
      town: call.town ?? null,
      cross_street: call.cross_street ?? null,
      poi: call.poi ?? null,
      status: call.status ?? null,
      received_at: call.first_seen_at ?? null,
      closed_at: isClosed ? call.updated_at ?? null : null,
      last_update_at: call.updated_at ?? null,
      transcription_status: call.transcription_status ?? null,
      grouping_status: call.grouping_status ?? null,
      grouping_decision: call.grouping_decision ?? null,
      grouping_confidence: call.grouping_confidence ?? null,
      grouping_requires_review: Boolean(call.grouping_requires_review),
      summary: call.summary ?? null,
      metadata,
      audio_url: `/api/calls/${call.call_id}/audio`,
      transcript_count: transcriptCount,
      contributes_to_summary: summaryContributor
    };

    events.push({
      event_id: dispatchEventId,
      event_type: "dispatch",
      timestamp: call.first_seen_at,
      title: call.agency ? `${call.agency} dispatch` : "Dispatch",
      ...basePayload
    });
  });

  events.sort((a, b) => {
    const left = toTimestamp(a.timestamp) ?? 0;
    const right = toTimestamp(b.timestamp) ?? 0;
    if (left !== right) return left - right;
    return a.event_id.localeCompare(b.event_id);
  });

  return {
    incident_id: incidentId,
    events,
    summary: buildSummaryStatements(rollups)
  };
}

module.exports = {
  getIncidentTimeline
};
