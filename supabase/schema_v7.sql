-- Schema v7: Multi-user authentication
-- Run AFTER schema_v5.sql and schema_v6.sql
-- ⚠️  Read the comment at the bottom before running

-- ─────────────────────────────────────────────────────────────
-- 1. Add user_id column to every user-owned table
-- ─────────────────────────────────────────────────────────────
ALTER TABLE tasks       ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE subjects    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE fixed_blocks ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE drafts      ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE area_tags   ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE someday     ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
-- subtasks are protected via their parent task (see policy below)

-- ─────────────────────────────────────────────────────────────
-- 2. Performance indexes
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS tasks_user_id_idx        ON tasks        (user_id);
CREATE INDEX IF NOT EXISTS subjects_user_id_idx     ON subjects     (user_id);
CREATE INDEX IF NOT EXISTS fixed_blocks_user_id_idx ON fixed_blocks (user_id);
CREATE INDEX IF NOT EXISTS drafts_user_id_idx       ON drafts       (user_id);
CREATE INDEX IF NOT EXISTS area_tags_user_id_idx    ON area_tags    (user_id);
CREATE INDEX IF NOT EXISTS someday_user_id_idx      ON someday      (user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. Drop old open-access policies
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all"            ON tasks;
  DROP POLICY IF EXISTS "Allow all on tasks"   ON tasks;
  DROP POLICY IF EXISTS "Allow all"            ON subjects;
  DROP POLICY IF EXISTS "Allow all on subjects" ON subjects;
  DROP POLICY IF EXISTS "Allow all"            ON fixed_blocks;
  DROP POLICY IF EXISTS "Allow all on fixed_blocks" ON fixed_blocks;
  DROP POLICY IF EXISTS "Allow all"            ON drafts;
  DROP POLICY IF EXISTS "Allow all on drafts"  ON drafts;
  DROP POLICY IF EXISTS "Allow all"            ON area_tags;
  DROP POLICY IF EXISTS "Allow all on area_tags" ON area_tags;
  DROP POLICY IF EXISTS "Allow all on someday" ON someday;
  DROP POLICY IF EXISTS "Allow all"            ON subtasks;
  DROP POLICY IF EXISTS "Allow all on subtasks" ON subtasks;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. New RLS policies scoped to auth.uid()
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "users_own_tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_subjects" ON subjects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_blocks" ON fixed_blocks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_drafts" ON drafts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_tags" ON area_tags
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_someday" ON someday
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Subtasks inherit access from their parent task
CREATE POLICY "users_own_subtasks" ON subtasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = subtasks.task_id
        AND tasks.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = subtasks.task_id
        AND tasks.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 5. AFTER creating your Plani account, run the block below
--    to claim your existing data.
--    Replace YOUR-USER-ID-HERE with your ID from:
--    Supabase Dashboard → Authentication → Users → copy the UUID
-- ─────────────────────────────────────────────────────────────
/*
DO $$
DECLARE v_uid uuid := 'YOUR-USER-ID-HERE';
BEGIN
  UPDATE tasks        SET user_id = v_uid WHERE user_id IS NULL;
  UPDATE subjects     SET user_id = v_uid WHERE user_id IS NULL;
  UPDATE fixed_blocks SET user_id = v_uid WHERE user_id IS NULL;
  UPDATE drafts       SET user_id = v_uid WHERE user_id IS NULL;
  UPDATE area_tags    SET user_id = v_uid WHERE user_id IS NULL;
  UPDATE someday      SET user_id = v_uid WHERE user_id IS NULL;
  RAISE NOTICE 'Data claimed for user %', v_uid;
END $$;
*/
