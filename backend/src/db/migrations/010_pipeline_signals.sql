CREATE TABLE IF NOT EXISTS pipeline_signals (
  id          TEXT PRIMARY KEY,
  call_id     TEXT NOT NULL,
  stage       TEXT NOT NULL,
  signal      TEXT NOT NULL CHECK(signal IN ('ok','needs_review','ambiguous','retry_grouping')),
  reason      TEXT,
  created_at  TEXT NOT NULL,
  FOREIGN KEY (call_id) REFERENCES calls(call_id)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_signals_call ON pipeline_signals(call_id, stage);
CREATE INDEX IF NOT EXISTS idx_pipeline_signals_signal ON pipeline_signals(signal);
CREATE INDEX IF NOT EXISTS idx_pipeline_signals_created ON pipeline_signals(created_at);
