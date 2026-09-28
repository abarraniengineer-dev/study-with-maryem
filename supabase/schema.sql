-- ============================================================
-- Study With Maryem — Supabase schema
-- Run this in the Supabase SQL editor (SQL → New query → paste → Run).
-- Every table is keyed to auth.users and locked with RLS: each signed-in
-- user can only ever read and write their own rows.
-- ============================================================

-- ---------- profile (one row per user) ----------
create table if not exists public.profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Maryem',
  xp integer not null default 0 check (xp >= 0),
  streak integer not null default 0 check (streak >= 0),
  last_study_date date,
  rest_days date[] not null default '{}',
  energy text not null default 'okay' check (energy in ('exhausted','low','okay','focused')),
  energy_updated_at timestamptz,
  mascot text not null default 'cat' check (mascot in ('panda','bunny','cat','flower')),
  mascot_name text not null default 'Bloom',
  weekly_goal_minutes integer not null default 600 check (weekly_goal_minutes between 0 and 10080),
  daily_goal_minutes integer not null default 120 check (daily_goal_minutes between 0 and 1440),
  music_url text not null default '',
  music_title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- subjects ----------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  color text not null default '#c98a94',
  priority integer not null default 2 check (priority in (1,2,3)),
  difficulty text not null default 'normal' check (difficulty in ('easy','normal','difficult')),
  status text not null default 'on-track' check (status in ('behind','on-track','strong')),
  archived boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_subjects_user on public.subjects (user_id);

-- ---------- tasks ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  subject_id uuid references public.subjects (id) on delete set null,
  date_key date not null,
  time_min integer check (time_min between 0 and 1439),
  duration_min integer not null default 30 check (duration_min between 5 and 600),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  reminder boolean not null default false,
  recurrence text not null default 'none' check (recurrence in ('none','daily','weekdays','weekly')),
  notes text not null default '',
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tasks_user_date on public.tasks (user_id, date_key);
create index if not exists idx_tasks_user_subject on public.tasks (user_id, subject_id);

-- ---------- schedule events ----------
create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  subject_id uuid references public.subjects (id) on delete set null,
  date_key date not null,
  start_min integer not null check (start_min between 0 and 1439),
  duration_min integer not null default 60 check (duration_min between 5 and 1440),
  type text not null default 'study' check (type in ('school','study','break','free','assignment','other')),
  recurring text not null default 'none' check (recurring in ('none','daily','weekdays','weekly')),
  reminder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_events_user_date on public.schedule_events (user_id, date_key);

-- ---------- focus sessions ----------
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,
  revision_item_id uuid references public.revision_items (id) on delete set null,
  date_key date not null,
  start_min integer not null check (start_min between 0 and 1439),
  minutes integer not null check (minutes between 1 and 600),
  kind text not null default 'study' check (kind in ('study','revision','task','exam-prep')),
  label text not null default 'Focus session',
  created_at timestamptz not null default now()
);
create index if not exists idx_sessions_user_date on public.focus_sessions (user_id, date_key);

-- ---------- revision items (spaced repetition) ----------
create table if not exists public.revision_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  title text not null,
  learned_at date not null,
  offsets integer[] not null default '{1,3,7,14,30}',
  completed jsonb not null default '{}'::jsonb, -- {"1": "2026-09-29", ...}
  overrides jsonb not null default '{}'::jsonb, -- {"3": "2026-10-05", ...}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_revisions_user on public.revision_items (user_id);

-- ---------- exams & deadlines ----------
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  title text not null,
  kind text not null default 'exam' check (kind in ('exam','assignment','project','deadline')),
  date_key date not null,
  time_min integer check (time_min between 0 and 1439),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_exams_user_date on public.exams (user_id, date_key);

-- ---------- settings (one row per user) ----------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  notifications boolean not null default false,
  bloom_use_context boolean not null default true,
  reduced_motion boolean,
  updated_at timestamptz not null default now()
);

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profile_touch on public.profile;
create trigger trg_profile_touch before update on public.profile
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_subjects_touch on public.subjects;
create trigger trg_subjects_touch before update on public.subjects
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_tasks_touch on public.tasks;
create trigger trg_tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_events_touch on public.schedule_events;
create trigger trg_events_touch before update on public.schedule_events
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_revisions_touch on public.revision_items;
create trigger trg_revisions_touch before update on public.revision_items
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_exams_touch on public.exams;
create trigger trg_exams_touch before update on public.exams
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------
alter table public.profile enable row level security;
alter table public.subjects enable row level security;
alter table public.tasks enable row level security;
alter table public.schedule_events enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.revision_items enable row level security;
alter table public.exams enable row level security;
alter table public.user_settings enable row level security;

-- Users may only touch rows that belong to them. (user_id = auth.uid() is
-- enforced by the database, not the client.)
do $$
declare t text;
begin
  foreach t in array array['profile','subjects','tasks','schedule_events','focus_sessions','revision_items','exams','user_settings']
  loop
    execute format('drop policy if exists "own rows select" on public.%I', t);
    execute format('create policy "own rows select" on public.%I for select using (user_id = auth.uid())', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('create policy "own rows insert" on public.%I for insert with check (user_id = auth.uid())', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('create policy "own rows update" on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);
    execute format('create policy "own rows delete" on public.%I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;
