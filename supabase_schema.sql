-- ==============================================================================
-- DISCIPLINE WARRIOR APP: SUPABASE REALTIME & LEADERBOARD SETUP SCRIPT
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ==============================================================================

-- 1. Create discipline_leaderboard table for real-time scores
create table if not exists public.discipline_leaderboard (
  user_id text primary key,
  display_name text not null,
  custom_alias text,
  photo_url text,
  rank_index integer default 1,
  rank_id text default 'bronz',
  rank_name text default 'Bronz',
  tier_category text default 'Foundation',
  qualifying_weeks integer default 0,
  discipline_score integer default 0,
  weekly_completed_checks integer default 0,
  weekly_target_checks integer default 35,
  top_habits jsonb default '[]'::jsonb,
  is_public boolean default true,
  updated_at timestamptz default now()
);

-- 2. Create discipline_profiles table for user routine habits & checks
create table if not exists public.discipline_profiles (
  user_id text primary key,
  categories jsonb default '[]'::jsonb,
  checks jsonb default '{}'::jsonb,
  bonus_weeks integer default 0,
  updated_at timestamptz default now()
);

-- 3. Enable Row Level Security (RLS)
alter table public.discipline_leaderboard enable row level security;
alter table public.discipline_profiles enable row level security;

-- 4. Configure RLS Policies
-- Allow anyone to read leaderboard entries
drop policy if exists "Allow public read on leaderboard" on public.discipline_leaderboard;
create policy "Allow public read on leaderboard"
  on public.discipline_leaderboard
  for select
  using (true);

-- Allow authenticated and guest users to insert/update their scores
drop policy if exists "Allow all to upsert leaderboard" on public.discipline_leaderboard;
create policy "Allow all to upsert leaderboard"
  on public.discipline_leaderboard
  for all
  using (true)
  with check (true);

-- Allow profile access
drop policy if exists "Allow user profile access" on public.discipline_profiles;
create policy "Allow user profile access"
  on public.discipline_profiles
  for all
  using (true)
  with check (true);

-- 5. Enable Supabase Realtime broadcast for live updates across devices
-- This triggers postgres_changes so all connected devices update their leaderboard instantly
alter publication supabase_realtime add table public.discipline_leaderboard;
