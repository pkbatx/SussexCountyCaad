CREATE TABLE IF NOT EXISTS agency_registry (
  agency_id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  service_type TEXT,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agency_registry_name ON agency_registry(canonical_name);
CREATE INDEX IF NOT EXISTS idx_agency_registry_service ON agency_registry(service_type);
CREATE INDEX IF NOT EXISTS idx_agency_registry_last_seen ON agency_registry(last_seen_at);

ALTER TABLE calls ADD COLUMN agency_id TEXT;
ALTER TABLE calls ADD COLUMN agency_name TEXT;
ALTER TABLE calls ADD COLUMN agency_service_type TEXT;

CREATE INDEX IF NOT EXISTS idx_calls_agency_name ON calls(agency_name);
