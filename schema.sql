-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Timers Table
create table if not exists timers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  title text not null,
  type text default 'goal', -- 'goal' or 'stopwatch'
  total_seconds integer default 0,
  remaining_seconds integer default 0,
  elapsed_seconds integer default 0,
  is_running boolean default false,
  last_tick_at bigint, -- Storing timestamp as bigint
  color text,
  size text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- History Table
create table if not exists week_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  week_start timestamp with time zone not null,
  snapshot_json jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table timers enable row level security;
alter table week_history enable row level security;

-- Timers Policies
create policy "Users can view their own timers" on timers
  for select using (auth.uid() = user_id);

create policy "Users can insert their own timers" on timers
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own timers" on timers
  for update using (auth.uid() = user_id);

create policy "Users can delete their own timers" on timers
  for delete using (auth.uid() = user_id);

-- History Policies
create policy "Users can view their own history" on week_history
  for select using (auth.uid() = user_id);

create policy "Users can insert their own history" on week_history
  for insert with check (auth.uid() = user_id);
