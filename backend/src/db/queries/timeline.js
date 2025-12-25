function listIncidentTimelineCalls(db, incidentId) {
  return db
    .prepare(
      `SELECT calls.*, COALESCE(stage_status.display_status, calls.status) as status,
        calls.agency_name as agency, calls.service_type as service_type,
        gd.incident_id as incident_id, gd.confidence as grouping_confidence,
        gd.requires_review as grouping_requires_review, gd.decision as grouping_decision,
        gd.created_at as grouping_created_at,
        transcription_stage.status as transcription_status,
        grouping_stage.status as grouping_status,
        json_extract(meta.payload_json, '$.incident_type') as incident_type,
        COALESCE(json_extract(meta.payload_json, '$.city'), json_extract(meta.payload_json, '$.jurisdiction')) as town,
        json_extract(meta.payload_json, '$.address_normalized') as address,
        COALESCE(json_extract(meta.payload_json, '$.cross_street_1'), json_extract(meta.payload_json, '$.cross_street_2')) as cross_street,
        json_extract(meta.payload_json, '$.landmark') as poi,
        meta.payload_json as metadata_json,
        summary.summary_text as summary
      FROM incident_group_members igm
      JOIN calls ON calls.call_id = igm.call_id
      LEFT JOIN (SELECT call_id,
        CASE
          WHEN SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) > 0 THEN 'failed'
          WHEN SUM(CASE WHEN status IN ('running', 'pending', 'processing') THEN 1 ELSE 0 END) > 0 THEN 'processing'
          WHEN COUNT(*) > 0 THEN 'succeeded'
          ELSE NULL
        END as display_status
        FROM call_stages GROUP BY call_id
      ) stage_status ON stage_status.call_id = calls.call_id
      LEFT JOIN call_stages transcription_stage
        ON transcription_stage.call_id = calls.call_id AND transcription_stage.stage_name = 'transcription'
      LEFT JOIN call_stages grouping_stage
        ON grouping_stage.call_id = calls.call_id AND grouping_stage.stage_name = 'grouping'
      LEFT JOIN metadata_extracts meta
        ON meta.call_id = calls.call_id
        AND meta.created_at = (SELECT MAX(created_at) FROM metadata_extracts WHERE call_id = calls.call_id)
      LEFT JOIN grouping_decisions gd
        ON gd.call_id = calls.call_id
        AND gd.created_at = (SELECT MAX(created_at) FROM grouping_decisions WHERE call_id = calls.call_id)
      LEFT JOIN summaries summary
        ON summary.subject_type = 'call'
        AND summary.subject_id = calls.call_id
        AND summary.version = (SELECT MAX(version) FROM summaries WHERE subject_id = calls.call_id AND subject_type = 'call')
      WHERE igm.incident_id = ?
      ORDER BY calls.first_seen_at ASC`
    )
    .all(incidentId);
}

function listIncidentTimelineTranscripts(db, incidentId) {
  return db
    .prepare(
      `SELECT transcripts.* FROM transcripts
       JOIN incident_group_members igm ON igm.call_id = transcripts.call_id
       WHERE igm.incident_id = ?
       ORDER BY transcripts.created_at ASC`
    )
    .all(incidentId);
}

function listTranscriptsForCall(db, callId) {
  return db
    .prepare("SELECT * FROM transcripts WHERE call_id = ? ORDER BY created_at ASC")
    .all(callId);
}

function getTranscriptById(db, transcriptId) {
  return db
    .prepare("SELECT * FROM transcripts WHERE transcript_id = ?")
    .get(transcriptId);
}

module.exports = {
  listIncidentTimelineCalls,
  listIncidentTimelineTranscripts,
  listTranscriptsForCall,
  getTranscriptById
};
