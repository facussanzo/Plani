-- Schema v9: Task priority
-- Run in Supabase SQL Editor

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text
  CHECK (priority IN ('high', 'medium', 'low'));

CREATE INDEX IF NOT EXISTS tasks_priority_idx ON tasks (priority);
