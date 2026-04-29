-- Schema v8: Subjects with area + task ordering
-- Run in Supabase SQL Editor

-- 1. Add area column to subjects (default 'university' for existing)
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS area text DEFAULT 'university';

-- 2. Update any existing subjects without area
UPDATE subjects SET area = 'university' WHERE area IS NULL;

-- 3. Index for performance
CREATE INDEX IF NOT EXISTS subjects_area_idx ON subjects (area);
