-- Schema v6: group_id for multi-date task instances + date for daily subtasks

-- tasks: add group_id to link multi-date instances
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS group_id uuid;
CREATE INDEX IF NOT EXISTS tasks_group_id_idx ON tasks (group_id);

-- subtasks: add optional date so subtasks can appear in DayView
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS date date;
CREATE INDEX IF NOT EXISTS subtasks_date_idx ON subtasks (date);
