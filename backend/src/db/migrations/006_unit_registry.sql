CREATE TABLE IF NOT EXISTS unit_registry (
  unit_id TEXT PRIMARY KEY,
  unit_key TEXT NOT NULL UNIQUE,
  unit_label TEXT NOT NULL,
  agency_id TEXT,
  agency_name TEXT,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  total_mentions INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_unit_registry_label ON unit_registry(unit_label);
CREATE INDEX IF NOT EXISTS idx_unit_registry_agency ON unit_registry(agency_name);
CREATE INDEX IF NOT EXISTS idx_unit_registry_last_seen ON unit_registry(last_seen_at);

CREATE TABLE IF NOT EXISTS unit_mentions (
  mention_id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL,
  call_id TEXT NOT NULL,
  observed_text TEXT,
  start_char INTEGER,
  end_char INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (unit_id) REFERENCES unit_registry(unit_id),
  FOREIGN KEY (call_id) REFERENCES calls(call_id)
);

CREATE INDEX IF NOT EXISTS idx_unit_mentions_call ON unit_mentions(call_id);
CREATE INDEX IF NOT EXISTS idx_unit_mentions_unit ON unit_mentions(unit_id);
