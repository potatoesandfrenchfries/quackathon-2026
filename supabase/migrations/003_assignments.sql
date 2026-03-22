-- ============================================================
-- Migration 003 — Assignments
-- Run in Supabase SQL Editor after 002_challenges.sql
-- ============================================================

-- ----------------------------------------------------------------
-- ASSIGNMENTS
-- ----------------------------------------------------------------
create table public.assignments (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  title        text        not null check (char_length(title) between 2 and 200),
  subject      text        not null check (char_length(subject) between 2 and 100),
  due_date     date        not null,
  difficulty   text        not null default 'medium'
                 check (difficulty in ('easy', 'medium', 'hard')),
  status       text        not null default 'todo'
                 check (status in ('todo', 'in_progress', 'completed')),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.assignments is
  'Personal coursework/assignment tracker. Completing awards credibility via MODULE_COMPLETED reason.';

comment on column public.assignments.difficulty is
  'easy=+5 cred, medium=+10 cred, hard=+20 cred on completion';

-- ----------------------------------------------------------------
-- TRIGGER — updated_at
-- Reuses handle_updated_at() defined in 001_initial_schema.sql
-- ----------------------------------------------------------------
create trigger assignments_updated_at
  before update on public.assignments
  for each row execute procedure public.handle_updated_at();

-- ----------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Assignments are private — owner-only access
-- ----------------------------------------------------------------
alter table public.assignments enable row level security;

create policy "assignments: owner all"
  on public.assignments for all
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------
create index idx_assignments_user_id  on public.assignments(user_id);
create index idx_assignments_due_date on public.assignments(due_date);
create index idx_assignments_status   on public.assignments(status);
