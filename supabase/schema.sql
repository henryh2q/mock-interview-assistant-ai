-- ─────────────────────────────────────────────────────────────────────────────
-- Mock Interview AI — Supabase Schema
-- Run this in the Supabase SQL editor for your project
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── Users ─────────────────────────────────────────────────────────────────────
create table if not exists users (
  id             uuid primary key default gen_random_uuid(),
  phone          varchar(20)  unique not null,
  name           varchar(100),
  target_role    varchar(100),
  years_experience integer,
  english_level  varchar(20)  not null default 'intermediate'
                   check (english_level in ('beginner','intermediate','advanced')),
  created_at     timestamptz  not null default now(),
  updated_at     timestamptz  not null default now()
);

-- ── Sessions ──────────────────────────────────────────────────────────────────
create table if not exists sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  name           varchar(200),
  jd_text        text not null,
  cv_text        text not null,
  extra_info     text,
  jd_file_path       varchar(500),
  cv_file_path       varchar(500),
  status             varchar(20) not null default 'draft'
                       check (status in ('draft','active','completed')),
  ai_model           varchar(50),
  shuffle_questions  boolean not null default false,
  interview_language varchar(20) not null default 'english'
                       check (interview_language in ('english','vietnamese')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_sessions_user_id      on sessions(user_id);
create index if not exists idx_sessions_created_at   on sessions(created_at desc);

-- ── Rounds ────────────────────────────────────────────────────────────────────
create table if not exists rounds (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references sessions(id) on delete cascade,
  type           varchar(30) not null
                   check (type in ('hr','technical','culture_fit')),
  title          varchar(200) not null,
  order_index    integer not null,
  duration_min   integer,
  question_count integer not null default 5,
  focus_areas    text[] not null default '{}',
  status         varchar(20) not null default 'pending'
                   check (status in ('pending','active','completed')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_rounds_session_id on rounds(session_id);

-- ── Messages ──────────────────────────────────────────────────────────────────
create table if not exists messages (
  id             uuid primary key default gen_random_uuid(),
  round_id       uuid not null references rounds(id) on delete cascade,
  session_id     uuid not null references sessions(id) on delete cascade,
  role           varchar(20) not null check (role in ('interviewer','candidate')),
  content        text not null,
  question_index integer,
  created_at     timestamptz not null default now()
);

create index if not exists idx_messages_round_id   on messages(round_id);
create index if not exists idx_messages_session_id on messages(session_id);

-- ── Evaluations ───────────────────────────────────────────────────────────────
create table if not exists evaluations (
  id               uuid primary key default gen_random_uuid(),
  message_id       uuid not null references messages(id) on delete cascade,
  round_id         uuid not null references rounds(id) on delete cascade,
  question_content text not null,
  score            integer check (score >= 1 and score <= 10),
  strengths        text[] not null default '{}',
  weaknesses       text[] not null default '{}',
  english_feedback text,
  missing_points   text[] not null default '{}',
  best_answer      text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_evaluations_round_id   on evaluations(round_id);
create index if not exists idx_evaluations_message_id on evaluations(message_id);

-- ── Round Results ─────────────────────────────────────────────────────────────
create table if not exists round_results (
  id            uuid primary key default gen_random_uuid(),
  round_id      uuid not null references rounds(id) on delete cascade,
  session_id    uuid not null references sessions(id) on delete cascade,
  verdict       varchar(20) not null check (verdict in ('pass','practice')),
  overall_score decimal(3,1),
  english_score integer,
  strengths     text[] not null default '{}',
  improvements  text[] not null default '{}',
  action_items  text[] not null default '{}',
  summary       text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_round_results_round_id   on round_results(round_id);
create index if not exists idx_round_results_session_id on round_results(session_id);

-- ── Saved Answers ─────────────────────────────────────────────────────────────
create table if not exists saved_answers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id) on delete cascade,
  evaluation_id    uuid not null references evaluations(id) on delete cascade,
  question_content text not null,
  candidate_answer text not null,
  best_answer      text not null,
  round_type       varchar(30) not null
                     check (round_type in ('hr','technical','culture_fit')),
  tags             text[] not null default '{}',
  created_at       timestamptz not null default now()
);

create index if not exists idx_saved_answers_user_id on saved_answers(user_id);

-- ── Events (Analytics) ────────────────────────────────────────────────────────
create table if not exists events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id) on delete set null,
  event_type varchar(100) not null,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_user_id    on events(user_id);
create index if not exists idx_events_event_type on events(event_type);
create index if not exists idx_events_created_at on events(created_at desc);

-- ── Daily Usage (Rate Limiting) ───────────────────────────────────────────────
create table if not exists daily_usage (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id) on delete cascade,
  date             date not null default current_date,
  sessions_created integer not null default 0,
  ai_calls         integer not null default 0,
  unique(user_id, date)
);

-- ── RPC Functions for atomic increments ──────────────────────────────────────
create or replace function increment_sessions_created(p_user_id uuid, p_date date)
returns void language plpgsql as $$
begin
  insert into daily_usage(user_id, date, sessions_created)
  values (p_user_id, p_date, 1)
  on conflict (user_id, date)
  do update set sessions_created = daily_usage.sessions_created + 1;
end;
$$;

create or replace function increment_ai_calls(p_user_id uuid, p_date date)
returns void language plpgsql as $$
begin
  insert into daily_usage(user_id, date, ai_calls)
  values (p_user_id, p_date, 1)
  on conflict (user_id, date)
  do update set ai_calls = daily_usage.ai_calls + 1;
end;
$$;

-- ── Row Level Security ────────────────────────────────────────────────────────
-- All reads/writes go through the service role key in API routes,
-- so RLS is enabled but the service role bypasses it by design.
-- Enable RLS on all tables to protect direct client access.

alter table users          enable row level security;
alter table sessions       enable row level security;
alter table rounds         enable row level security;
alter table messages       enable row level security;
alter table evaluations    enable row level security;
alter table round_results  enable row level security;
alter table saved_answers  enable row level security;
alter table events         enable row level security;
alter table daily_usage    enable row level security;

-- Storage bucket for interview documents
-- Run this separately in Supabase dashboard > Storage:
-- CREATE BUCKET interview-docs (public: false)

-- ── Migration: Interview model & shuffle settings ─────────────────────────────
-- Run this if the sessions table already exists (upgrading an existing DB):
alter table sessions add column if not exists ai_model    varchar(50);
alter table sessions add column if not exists shuffle_questions boolean not null default false;
alter table sessions add column if not exists interview_language varchar(20) not null default 'english'
  check (interview_language in ('english','vietnamese'));

-- OTP: add verified_at to track OTP-verified logins (optional, for audit)
-- No schema change needed — Twilio Verify handles OTP state externally.
