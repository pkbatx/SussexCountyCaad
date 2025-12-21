CREATE TABLE IF NOT EXISTS calls (
  call_id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL,
  file_size_bytes INTEGER,
  audio_format TEXT,
  first_seen_at TEXT NOT NULL,
  status TEXT NOT NULL,
  duplicate_of_call_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS call_stages (
  call_id TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_run_id TEXT,
  last_error TEXT,
  started_at TEXT,
  completed_at TEXT,
  PRIMARY KEY (call_id, stage_name),
  FOREIGN KEY (call_id) REFERENCES calls(call_id)
);

CREATE TABLE IF NOT EXISTS stage_runs (
  run_id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  error_detail TEXT,
  FOREIGN KEY (call_id) REFERENCES calls(call_id)
);

CREATE TABLE IF NOT EXISTS transcripts (
  transcript_id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  text TEXT NOT NULL,
  language TEXT,
  confidence REAL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (call_id) REFERENCES calls(call_id),
  FOREIGN KEY (run_id) REFERENCES stage_runs(run_id)
);

CREATE TABLE IF NOT EXISTS metadata_extracts (
  extract_id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  confidence_summary REAL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (call_id) REFERENCES calls(call_id),
  FOREIGN KEY (run_id) REFERENCES stage_runs(run_id)
);

CREATE TABLE IF NOT EXISTS summaries (
  summary_id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL,
  FOREIGN KEY (run_id) REFERENCES stage_runs(run_id)
);

CREATE TABLE IF NOT EXISTS incident_groups (
  incident_id TEXT PRIMARY KEY,
  normalized_address TEXT,
  incident_identifiers TEXT,
  group_confidence REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS incident_group_members (
  incident_id TEXT NOT NULL,
  call_id TEXT NOT NULL,
  link_reason TEXT NOT NULL,
  link_confidence REAL NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (incident_id, call_id),
  FOREIGN KEY (incident_id) REFERENCES incident_groups(incident_id),
  FOREIGN KEY (call_id) REFERENCES calls(call_id)
);

CREATE TABLE IF NOT EXISTS location_candidates (
  location_id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  normalized_text TEXT,
  geocode_json TEXT,
  confidence REAL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  routing_rule TEXT,
  dedupe_key TEXT NOT NULL,
  status TEXT NOT NULL,
  sent_at TEXT,
  error_detail TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_invocations (
  invocation_id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  request_json TEXT NOT NULL,
  response_json TEXT NOT NULL,
  token_usage TEXT,
  latency_ms INTEGER,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (call_id) REFERENCES calls(call_id)
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL,
  checksum TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_call_stages_status ON call_stages(status);
CREATE INDEX IF NOT EXISTS idx_stage_runs_call_stage ON stage_runs(call_id, stage_name);
