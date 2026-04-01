-- Plani - Database Schema
-- Run this in your Supabase SQL Editor

-- Tasks table
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  type text not null default 'university' check (type in ('university', 'work', 'objective', 'recurring')),
  category text,
  deadline date,
  start_date date,
  end_date date,
  is_all_day boolean default true,
  time time,
  progress_current integer default 0,
  progress_total integer default 0,
  is_recurring boolean default false,
  recurring_pattern text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Fixed blocks table
create table if not exists fixed_blocks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  start_time time not null,
  end_time time not null,
  days_of_week integer[] not null,
  type text not null default 'work' check (type in ('work', 'university', 'other')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Drafts table
create table if not exists drafts (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Row Level Security)
alter table tasks enable row level security;
alter table fixed_blocks enable row level security;
alter table drafts enable row level security;

-- Allow all operations for now (single user app - no auth)
create policy "Allow all on tasks" on tasks for all using (true) with check (true);
create policy "Allow all on fixed_blocks" on fixed_blocks for all using (true) with check (true);
create policy "Allow all on drafts" on drafts for all using (true) with check (true);

-- Useful indexes
create index if not exists tasks_start_date_idx on tasks (start_date);
create index if not exists tasks_deadline_idx on tasks (deadline);
create index if not exists tasks_type_idx on tasks (type);
create index if not exists tasks_status_idx on tasks (status);
create index if not exists tasks_created_at_idx on tasks (created_at desc);
create index if not exists drafts_created_at_idx on drafts (created_at desc);
create index if not exists fixed_blocks_start_time_idx on fixed_blocks (start_time);
