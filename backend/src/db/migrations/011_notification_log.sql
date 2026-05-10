CREATE TABLE IF NOT EXISTS notification_log (
  id         TEXT PRIMARY KEY,
  channel    TEXT NOT NULL,
  payload    TEXT NOT NULL,
  status     INTEGER,
  error      TEXT,
  attempt    INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_log_channel ON notification_log(channel, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at);
