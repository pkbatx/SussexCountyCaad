ALTER TABLE calls ADD COLUMN re_alert_flag INTEGER NOT NULL DEFAULT 0;
ALTER TABLE calls ADD COLUMN service_type TEXT;

ALTER TABLE incident_groups ADD COLUMN call_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE incident_groups ADD COLUMN re_alert_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS incident_agency_stats (
  incident_id TEXT NOT NULL,
  agency_id TEXT NOT NULL,
  call_count INTEGER NOT NULL DEFAULT 0,
  re_alert_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (incident_id, agency_id),
  FOREIGN KEY (incident_id) REFERENCES incident_groups(incident_id),
  FOREIGN KEY (agency_id) REFERENCES agency_registry(agency_id)
);

CREATE INDEX IF NOT EXISTS idx_incident_agency_stats_incident ON incident_agency_stats(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_agency_stats_agency ON incident_agency_stats(agency_id);

CREATE TABLE IF NOT EXISTS insight_metrics (
  metric_id TEXT PRIMARY KEY,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  group_key TEXT,
  value REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_insight_metrics_type_window ON insight_metrics(metric_type, window_start, window_end);
