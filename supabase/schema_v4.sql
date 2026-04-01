-- Plani – Schema v4
-- Run AFTER schema.sql + schema_v2.sql + schema_v3.sql

-- Add subject_id to fixed_blocks (optional FK to subjects)
ALTER TABLE fixed_blocks
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL;

-- Index for subject lookup
CREATE INDEX IF NOT EXISTS fixed_blocks_subject_id_idx ON fixed_blocks (subject_id);
