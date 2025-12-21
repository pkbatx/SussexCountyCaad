ALTER TABLE reference_data ADD COLUMN normalized_key TEXT;
ALTER TABLE reference_data ADD COLUMN raw_address TEXT;
ALTER TABLE reference_data ADD COLUMN latitude REAL;
ALTER TABLE reference_data ADD COLUMN longitude REAL;
ALTER TABLE reference_data ADD COLUMN source TEXT;
ALTER TABLE reference_data ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_reference_data_normalized ON reference_data(normalized_key);
CREATE INDEX IF NOT EXISTS idx_reference_data_type_normalized ON reference_data(ref_type, normalized_key);
