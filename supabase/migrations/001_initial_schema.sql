-- ============================================================
-- Buddy - Initial Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ----------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------
-- PROFILES
-- Extends auth.users - one row per registered user
-- ----------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  username            text unique not null,
  display_name        text,
  university          text,
  avatar_url          text,
  financial_snapshot  jsonb not null default '{}',
  -- e.g. {"income": 900, "expenses": 650, "goals": ["save_for_laptop"], "top_worry": "rent"}
  onboarding_complete boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.profiles is 'Public profile for each authenticated user.';

-- ----------------------------------------------------------------
-- CREDIBILITY EVENTS  (immutable ledger — never update, only insert)
-- ----------------------------------------------------------------
create table public.credibility_events (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  delta        integer     not null,          -- positive = gain, negative = loss
  reason       text        not null,          -- e.g. 'answer_accepted', 'fact_check_fail'
  topic        text,                          -- null = general/cross-topic
  reference_id uuid,                          -- post_id or answer_id that triggered this
  created_at   timestamptz not null default now()
);

-- Allowed reason values (informational — enforced in app layer)
comment on column public.credibility_events.reason is
  'One of: signup_bonus | answer_accepted | answer_upvoted | answer_downvoted |
   resource_shared | stake_won | stake_lost | fact_check_fail | fact_check_pass |
   streak_bonus | module_completed | spam_penalty | inactivity_decay';

comment on column public.credibility_events.topic is
  'One of: rent | loans | budgeting | investing | overdraft | savings | general';

-- ----------------------------------------------------------------
-- POSTS  (questions)
-- ----------------------------------------------------------------
create table public.posts (
  id                 uuid        primary key default gen_random_uuid(),
  author_id          uuid        not null references public.profiles(id) on delete cascade,
  title              text        not null check (char_length(title) between 10 and 300),
  body               text        not null check (char_length(body) >= 20),
  topic              text        not null check (
                       topic in ('rent','loans','budgeting','investing','overdraft','savings','general')
                     ),
  resolved           boolean     not null default false,
  accepted_answer_id uuid,                    -- FK added after answers table
  view_count         integer     not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- ANSWERS
-- ----------------------------------------------------------------
create table public.answers (
  id                     uuid        primary key default gen_random_uuid(),
  post_id                uuid        not null references public.posts(id) on delete cascade,
  author_id              uuid        not null references public.profiles(id) on delete cascade,
  content                text        not null check (char_length(content) >= 10),
  stake_amount           integer     not null default 0 check (stake_amount >= 0),
  -- Fact-checker results
  fact_check_status      text        not null default 'pending'
                           check (fact_check_status in ('pending','accurate','misleading','unverified')),
  fact_check_confidence  float,
  fact_check_evidence    text,
  fact_check_correction  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Now add accepted_answer FK to posts (circular reference, done after both tables exist)
alter table public.posts
  add constraint fk_accepted_answer
  foreign key (accepted_answer_id) references public.answers(id) on delete set null;

-- ----------------------------------------------------------------
-- VOTES  (credibility-weighted upvotes/downvotes on answers)
-- ----------------------------------------------------------------
create table public.votes (
  id                        uuid        primary key default gen_random_uuid(),
  voter_id                  uuid        not null references public.profiles(id) on delete cascade,
  answer_id                 uuid        not null references public.answers(id) on delete cascade,
  value                     integer     not null check (value in (-1, 1)),
  voter_credibility_at_vote integer,           -- snapshot for auditability
  created_at                timestamptz not null default now(),
  unique (voter_id, answer_id)                 -- one vote per user per answer
);

-- ----------------------------------------------------------------
-- AI RESPONSES  (cached per post — one AI response per question)
-- ----------------------------------------------------------------
create table public.ai_responses (
  id            uuid        primary key default gen_random_uuid(),
  post_id       uuid        not null references public.posts(id) on delete cascade,
  response_json jsonb       not null,
  -- {summary, action, confidence, top_source_user_id, top_source_cred, disclaimer}
  model_used    text,
  created_at    timestamptz not null default now(),
  unique (post_id)
);

-- ----------------------------------------------------------------
-- VIEWS
-- ----------------------------------------------------------------

-- Per-user, per-topic credibility score
create view public.user_topic_credibility as
  select
    user_id,
    coalesce(topic, 'general') as topic,
    sum(delta)::integer         as score,
    count(*)::integer           as event_count
  from public.credibility_events
  group by user_id, topic;

-- Overall credibility score per user
create view public.user_total_credibility as
  select
    user_id,
    coalesce(sum(delta), 0)::integer as total_score
  from public.credibility_events
  group by user_id;

-- Enriched answers view (joins author cred + vote totals) — used by AI orchestrator
create view public.answers_enriched as
  select
    a.*,
    p.username                as author_username,
    p.display_name            as author_display_name,
    coalesce(utc.total_score, 100) as author_total_cred,
    coalesce(utopic.score, 0)      as author_topic_cred,
    coalesce(v.vote_total, 0)      as vote_total,
    coalesce(v.vote_count, 0)      as vote_count
  from public.answers a
  join public.profiles p on p.id = a.author_id
  left join public.user_total_credibility utc  on utc.user_id = a.author_id
  left join public.posts po                    on po.id = a.post_id
  left join public.user_topic_credibility utopic
    on utopic.user_id = a.author_id and utopic.topic = po.topic
  left join (
    select
      answer_id,
      sum(value)::integer  as vote_total,
      count(*)::integer    as vote_count
    from public.votes
    group by answer_id
  ) v on v.answer_id = a.id;

-- ----------------------------------------------------------------
-- FUNCTIONS
-- ----------------------------------------------------------------

-- Tier label from score
create or replace function public.get_credibility_tier(score integer)
returns text
language plpgsql immutable
as $$
begin
  return case
    when score <  100  then 'newcomer'
    when score <  300  then 'learner'
    when score <  600  then 'contributor'
    when score <  900  then 'trusted'
    when score < 1200  then 'advisor'
    else                    'oracle'
  end;
end;
$$;

-- Vote weight multiplier based on voter credibility
create or replace function public.vote_weight(voter_cred integer)
returns float
language plpgsql immutable
as $$
begin
  -- Newcomer: 0.2×, Oracle (1200+): ~3.4×, capped at 5×
  return least(5.0, greatest(0.2, voter_cred::float / 350.0));
end;
$$;

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Auto-create profile + award signup bonus on new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer           -- runs as postgres, can write to public tables
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  counter       int := 0;
begin
  -- Derive a username from email, make it unique
  base_username := regexp_replace(
    split_part(new.email, '@', 1),
    '[^a-zA-Z0-9_]', '_', 'g'
  );
  final_username := base_username;

  loop
    begin
      insert into public.profiles (id, username, display_name)
      values (new.id, final_username, final_username);
      exit; -- success
    exception when unique_violation then
      counter := counter + 1;
      final_username := base_username || '_' || counter::text;
    end;
  end loop;

  -- 100-point signup bonus
  insert into public.credibility_events (user_id, delta, reason)
  values (new.id, 100, 'signup_bonus');

  return new;
end;
$$;

-- ----------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger posts_updated_at
  before update on public.posts
  for each row execute procedure public.handle_updated_at();

create trigger answers_updated_at
  before update on public.answers
  for each row execute procedure public.handle_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ----------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------

alter table public.profiles          enable row level security;
alter table public.credibility_events enable row level security;
alter table public.posts             enable row level security;
alter table public.answers           enable row level security;
alter table public.votes             enable row level security;
alter table public.ai_responses      enable row level security;

-- PROFILES
create policy "profiles: public read"
  on public.profiles for select using (true);

create policy "profiles: owner update"
  on public.profiles for update using (auth.uid() = id);

-- CREDIBILITY EVENTS
-- Anyone can read the ledger (transparency)
create policy "cred_events: public read"
  on public.credibility_events for select using (true);

-- Only service_role (backend) can insert — prevents client-side manipulation
create policy "cred_events: service insert"
  on public.credibility_events for insert
  with check (auth.role() = 'service_role');

-- POSTS
create policy "posts: public read"
  on public.posts for select using (true);

create policy "posts: auth insert"
  on public.posts for insert
  with check (auth.uid() = author_id);

create policy "posts: owner update"
  on public.posts for update
  using (auth.uid() = author_id);

-- ANSWERS
create policy "answers: public read"
  on public.answers for select using (true);

create policy "answers: auth insert"
  on public.answers for insert
  with check (auth.uid() = author_id);

create policy "answers: owner update"
  on public.answers for update
  using (auth.uid() = author_id);

-- VOTES
create policy "votes: public read"
  on public.votes for select using (true);

create policy "votes: auth insert"
  on public.votes for insert
  with check (auth.uid() = voter_id);

create policy "votes: owner delete"
  on public.votes for delete
  using (auth.uid() = voter_id);

-- AI RESPONSES
create policy "ai_responses: public read"
  on public.ai_responses for select using (true);

-- Only backend (service_role) writes AI responses
create policy "ai_responses: service insert"
  on public.ai_responses for insert
  with check (auth.role() = 'service_role');

create policy "ai_responses: service update"
  on public.ai_responses for update
  using (auth.role() = 'service_role');

-- ----------------------------------------------------------------
-- INDEXES  (performance for common queries)
-- ----------------------------------------------------------------

create index idx_credibility_events_user_id  on public.credibility_events(user_id);
create index idx_credibility_events_topic    on public.credibility_events(topic);
create index idx_credibility_events_created  on public.credibility_events(created_at desc);
create index idx_posts_author_id             on public.posts(author_id);
create index idx_posts_topic                 on public.posts(topic);
create index idx_posts_created               on public.posts(created_at desc);
create index idx_answers_post_id             on public.answers(post_id);
create index idx_answers_author_id           on public.answers(author_id);
create index idx_votes_answer_id             on public.votes(answer_id);
create index idx_votes_voter_id              on public.votes(voter_id);
