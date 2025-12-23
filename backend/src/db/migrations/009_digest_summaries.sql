CREATE TABLE IF NOT EXISTS digest_summaries (
  digest_id TEXT PRIMARY KEY,
  window_label TEXT NOT NULL,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  call_count_window INTEGER NOT NULL,
  summary_text TEXT NOT NULL,
  summary_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_digest_summaries_label_created
  ON digest_summaries(window_label, created_at);
