CREATE TABLE IF NOT EXISTS reference_embeddings (
  reference_id TEXT NOT NULL,
  model TEXT NOT NULL,
  embedding_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (reference_id, model),
  FOREIGN KEY (reference_id) REFERENCES reference_data(reference_id)
);

CREATE INDEX IF NOT EXISTS idx_reference_embeddings_model ON reference_embeddings(model);
