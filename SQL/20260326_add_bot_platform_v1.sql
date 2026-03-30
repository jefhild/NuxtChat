create table if not exists public.live_mood_states (
  user_id uuid primary key
    references public.profiles (user_id) on delete cascade,
  emotion text null,
  intent text null,
  energy text null,
  privacy text not null default 'private_matching_only',
  time_horizon text not null default 'right_now',
  free_text_raw text null,
  free_text_refined text null,
  source_persona text null,
  source_type text not null default 'mixed',
  confidence numeric(4,3) null,
  captured_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_mood_states_privacy_chk
    check (privacy in ('public_mood_post', 'private_matching_only')),
  constraint live_mood_states_time_horizon_chk
    check (time_horizon in ('right_now', 'today', 'generally_lately')),
  constraint live_mood_states_energy_chk
    check (energy in ('drained', 'normal', 'wired')),
  constraint live_mood_states_source_type_chk
    check (source_type in ('self_selected', 'bot_inferred', 'mixed'))
);

create index if not exists live_mood_states_expires_at_idx
  on public.live_mood_states (expires_at);

create table if not exists public.mood_preferences (
  user_id uuid primary key
    references public.profiles (user_id) on delete cascade,
  allow_mood_matching boolean not null default true,
  allow_bot_intro boolean not null default true,
  default_mood_privacy text not null default 'private_matching_only',
  show_profile_aura boolean not null default false,
  preferred_intents text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint mood_preferences_default_privacy_chk
    check (default_mood_privacy in ('public_mood_post', 'private_matching_only'))
);

create table if not exists public.bot_handoffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references public.profiles (user_id) on delete cascade,
  from_persona text not null,
  to_persona text not null,
  reason text not null,
  context_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bot_handoffs_user_id_idx
  on public.bot_handoffs (user_id, created_at desc);

create table if not exists public.bot_action_logs (
  id uuid primary key default gen_random_uuid(),
  actor_persona text not null,
  capability text not null,
  actor_user_id uuid null
    references auth.users (id) on delete set null,
  target_user_id uuid null
    references auth.users (id) on delete set null,
  request_summary jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  status text not null default 'ok',
  created_at timestamptz not null default now(),
  constraint bot_action_logs_status_chk
    check (status in ('ok', 'denied', 'error'))
);

create index if not exists bot_action_logs_target_user_id_idx
  on public.bot_action_logs (target_user_id, created_at desc);

create index if not exists bot_action_logs_actor_persona_idx
  on public.bot_action_logs (actor_persona, created_at desc);
