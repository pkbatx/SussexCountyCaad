CREATE TABLE IF NOT EXISTS incident_rollups (
  rollup_id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  summary_text TEXT NOT NULL,
  latest_update_json TEXT NOT NULL,
  key_fields_json TEXT NOT NULL,
  confidence REAL NOT NULL,
  open_questions_json TEXT NOT NULL,
  included_call_ids_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (incident_id) REFERENCES incident_groups(incident_id),
  FOREIGN KEY (run_id) REFERENCES stage_runs(run_id)
);

CREATE INDEX IF NOT EXISTS idx_incident_rollups_incident ON incident_rollups(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_rollups_created ON incident_rollups(created_at);
