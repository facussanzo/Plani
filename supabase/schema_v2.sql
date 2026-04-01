-- Plani - Schema Update v2
-- Run this AFTER schema.sql (adds subjects table + subject_id to tasks)

-- Subjects table (materias de universidad)
create table if not exists subjects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add subject_id to tasks (nullable FK)
alter table tasks
  add column if not exists subject_id uuid references subjects(id) on delete set null;

-- Enable RLS
alter table subjects enable row level security;

-- Allow all (single user app)
create policy "Allow all on subjects" on subjects for all using (true) with check (true);

-- Index
create index if not exists tasks_subject_id_idx on tasks (subject_id);
create index if not exists subjects_name_idx on subjects (name);
