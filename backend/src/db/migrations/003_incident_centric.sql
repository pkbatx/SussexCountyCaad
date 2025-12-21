CREATE TABLE IF NOT EXISTS grouping_decisions (
  decision_id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  incident_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  matched_existing_incident_id TEXT,
  confidence REAL NOT NULL,
  requires_review INTEGER NOT NULL,
  signals_json TEXT NOT NULL,
  explanation TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (call_id) REFERENCES calls(call_id),
  FOREIGN KEY (incident_id) REFERENCES incident_groups(incident_id),
  FOREIGN KEY (run_id) REFERENCES stage_runs(run_id)
);

CREATE INDEX IF NOT EXISTS idx_grouping_decisions_incident ON grouping_decisions(incident_id);
CREATE INDEX IF NOT EXISTS idx_grouping_decisions_call ON grouping_decisions(call_id);
CREATE INDEX IF NOT EXISTS idx_grouping_decisions_created ON grouping_decisions(created_at);

CREATE TABLE IF NOT EXISTS reference_data (
  reference_id TEXT PRIMARY KEY,
  ref_type TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reference_data_type ON reference_data(ref_type);
CREATE INDEX IF NOT EXISTS idx_reference_data_name ON reference_data(canonical_name);
CREATE INDEX IF NOT EXISTS idx_reference_data_active ON reference_data(active);

CREATE TABLE IF NOT EXISTS feedback_signals (
  feedback_id TEXT PRIMARY KEY,
  incident_id TEXT,
  call_id TEXT,
  prior_decision_id TEXT,
  signal_type TEXT NOT NULL,
  details_json TEXT NOT NULL,
  adjustment_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (incident_id) REFERENCES incident_groups(incident_id),
  FOREIGN KEY (call_id) REFERENCES calls(call_id),
  FOREIGN KEY (prior_decision_id) REFERENCES grouping_decisions(decision_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_signals_incident ON feedback_signals(incident_id);
CREATE INDEX IF NOT EXISTS idx_feedback_signals_call ON feedback_signals(call_id);
CREATE INDEX IF NOT EXISTS idx_feedback_signals_created ON feedback_signals(created_at);
