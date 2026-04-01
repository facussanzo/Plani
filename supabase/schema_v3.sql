-- Plani – Schema v3
-- Run AFTER schema.sql + schema_v2.sql

-- 1. Events flag on tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_event boolean DEFAULT false;

-- 2. Tags array on tasks (stores area_tag IDs as text)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tag_ids text[] DEFAULT '{}';

-- 3. Area-specific tags table (Universidad / Trabajo / General)
CREATE TABLE IF NOT EXISTS area_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name  text NOT NULL,
  area  text NOT NULL DEFAULT 'general'
        CHECK (area IN ('university', 'work', 'general')),
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE area_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on area_tags" ON area_tags FOR ALL USING (true) WITH CHECK (true);

-- 4. Subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
  id       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id  uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title    text NOT NULL,
  is_done  boolean DEFAULT false,
  position integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on subtasks" ON subtasks FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS subtasks_task_id_idx ON subtasks (task_id);
CREATE INDEX IF NOT EXISTS area_tags_area_idx   ON area_tags (area);
CREATE INDEX IF NOT EXISTS tasks_is_event_idx   ON tasks (is_event);

-- Seed some default tags (optional – delete if you prefer to start empty)
INSERT INTO area_tags (name, area, color) VALUES
  ('TP',        'university', '#3b82f6'),
  ('Parcial',   'university', '#8b5cf6'),
  ('Examen',    'university', '#ef4444'),
  ('Lectura',   'university', '#14b8a6'),
  ('Proyecto',  'work',       '#f59e0b'),
  ('Reunión',   'work',       '#f97316'),
  ('Entrega',   'work',       '#ef4444'),
  ('Review',    'work',       '#6366f1')
ON CONFLICT DO NOTHING;
