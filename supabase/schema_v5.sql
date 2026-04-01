-- Plani – Schema v5
-- Run in Supabase SQL Editor AFTER schema_v4.sql

-- 1. Migrate tasks: replace 'objective' type with 'personal'
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_type_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_type_check
  CHECK (type IN ('university', 'work', 'personal', 'recurring'));
UPDATE tasks SET type = 'personal' WHERE type = 'objective';

-- 2. Update fixed_blocks type to include 'personal'
ALTER TABLE fixed_blocks DROP CONSTRAINT IF EXISTS fixed_blocks_type_check;
ALTER TABLE fixed_blocks ADD CONSTRAINT fixed_blocks_type_check
  CHECK (type IN ('work', 'university', 'personal', 'other'));

-- 3. Update area_tags to include 'personal' area
ALTER TABLE area_tags DROP CONSTRAINT IF EXISTS area_tags_area_check;
ALTER TABLE area_tags ADD CONSTRAINT area_tags_area_check
  CHECK (area IN ('university', 'work', 'general', 'personal'));

-- 4. Someday/Maybe table
CREATE TABLE IF NOT EXISTS someday (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  notes text,
  area text DEFAULT 'personal' CHECK (area IN ('personal', 'university', 'work')),
  is_done boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE someday ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on someday" ON someday FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS someday_area_idx ON someday (area);
CREATE INDEX IF NOT EXISTS someday_created_at_idx ON someday (created_at DESC);
