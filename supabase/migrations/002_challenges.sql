-- ============================================================
-- Migration 002 — Challenges + Goals
-- Run in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- ----------------------------------------------------------------
-- CHALLENGES  (time-boxed financial habits students can join)
-- ----------------------------------------------------------------
create table public.challenges (
  id                 uuid        primary key default gen_random_uuid(),
  created_by         uuid        references public.profiles(id) on delete set null,
  title              text        not null,
  description        text        not null,
  topic              text        check (topic in (
                       'rent','loans','budgeting','investing',
                       'overdraft','savings','general'
                     )),
  target_description text        not null,  -- e.g. "Save £50 this month"
  duration_days      integer     not null default 30,
  participant_count  integer     not null default 0,  -- denormalised for fast reads
  completed_count    integer     not null default 0,
  is_active          boolean     not null default true,
  created_at         timestamptz not null default now()
);

comment on table public.challenges is
  'Shared time-boxed financial habit challenges that students can join.';

-- ----------------------------------------------------------------
-- CHALLENGE PARTICIPANTS
-- ----------------------------------------------------------------
create table public.challenge_participants (
  id              uuid        primary key default gen_random_uuid(),
  challenge_id    uuid        not null references public.challenges(id) on delete cascade,
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  join_number     integer     not null,      -- ordinal position: "you are #24"
  status          text        not null default 'active'
                    check (status in ('active', 'completed', 'abandoned')),
  checkin_streak  integer     not null default 0,
  last_checkin_at timestamptz,
  completed_at    timestamptz,
  joined_at       timestamptz not null default now(),
  unique (challenge_id, user_id)
);

comment on table public.challenge_participants is
  'Join records for challenges, with per-user streak and status.';

-- ----------------------------------------------------------------
-- GOALS  (personal savings goals — replaces frontend mock store)
-- ----------------------------------------------------------------
create table public.goals (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  title          text        not null,
  emoji          text        not null default '🎯',
  color          text        not null default 'blue',
  target_amount  numeric     not null check (target_amount > 0),
  current_amount numeric     not null default 0,
  deadline       date        not null,
  is_shared      boolean     not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.goals is
  'Personal savings goals. is_shared = true makes them visible to the community.';

-- ----------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------

-- Keep participant_count + completed_count in sync on challenges
create or replace function public.sync_challenge_count()
returns trigger
language plpgsql
as $$
declare
  cid uuid;
begin
  cid := coalesce(new.challenge_id, old.challenge_id);
  update public.challenges
  set
    participant_count = (
      select count(*) from public.challenge_participants
      where challenge_id = cid and status != 'abandoned'
    ),
    completed_count = (
      select count(*) from public.challenge_participants
      where challenge_id = cid and status = 'completed'
    )
  where id = cid;
  return coalesce(new, old);
end;
$$;

create trigger trg_challenge_count
  after insert or update or delete on public.challenge_participants
  for each row execute procedure public.sync_challenge_count();

-- updated_at for goals
create trigger goals_updated_at
  before update on public.goals
  for each row execute procedure public.handle_updated_at();

-- ----------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------

alter table public.challenges             enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.goals                  enable row level security;

-- Challenges: anyone can read; only auth users can create
create policy "challenges: public read"
  on public.challenges for select using (true);

create policy "challenges: auth insert"
  on public.challenges for insert
  with check (auth.uid() = created_by);

-- Participants: owner can do anything; anyone can read (for social proof)
create policy "participants: owner all"
  on public.challenge_participants for all
  using (auth.uid() = user_id);

create policy "participants: public read"
  on public.challenge_participants for select using (true);

-- Goals: owner has full access; shared goals are publicly readable
create policy "goals: owner all"
  on public.goals for all
  using (auth.uid() = user_id);

create policy "goals: shared read"
  on public.goals for select
  using (is_shared = true);

-- ----------------------------------------------------------------
-- SEED DATA  (starter challenges for demo)
-- ----------------------------------------------------------------

insert into public.challenges (title, description, topic, target_description, duration_days, participant_count)
values
  (
    'Emergency Fund Starter',
    'Build your first £500 safety net. No more stressing when something breaks — you''ll have it covered.',
    'savings',
    'Save £500 in your easy-access account',
    30, 0
  ),
  (
    '50/30/20 February',
    'Run the classic budget rule for one full month. Needs 50%, wants 30%, savings 20%. See if it actually works for you.',
    'budgeting',
    'Track spending and hit the 50/30/20 split for 30 days',
    30, 0
  ),
  (
    'No-Spend Week',
    'One week. No non-essential spending. You''ll be surprised what you don''t actually need.',
    'budgeting',
    'Zero discretionary spending for 7 days',
    7, 0
  ),
  (
    'Open Your First ISA',
    'Stocks & Shares ISA or Cash ISA — doesn''t matter which. Just get one open before the tax year ends.',
    'investing',
    'Open an ISA account and make your first deposit',
    14, 0
  ),
  (
    'Overdraft-Free Month',
    'Stay out of your overdraft for a full month. Harder than it sounds, way better than you''d expect.',
    'overdraft',
    'End each week with a positive bank balance',
    30, 0
  ),
  (
    'Student Loan Reality Check',
    'Actually read your student loan statement and understand what you owe. Most students have no idea.',
    'loans',
    'Log into Student Finance and note your current balance + repayment threshold',
    7, 0
  );
