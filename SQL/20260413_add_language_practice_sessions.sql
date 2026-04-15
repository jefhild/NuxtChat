create table if not exists public.language_practice_sessions (
  id uuid primary key default gen_random_uuid(),
  learner_user_id uuid not null references public.profiles (user_id) on delete cascade,
  partner_user_id uuid not null references public.profiles (user_id) on delete cascade,
  target_language_code text not null,
  learner_native_language_code text null,
  target_language_level text null,
  correction_preference text null,
  language_exchange_mode text not null default 'practice_only',
  source text not null default 'language_directory',
  is_ai_partner boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz null,

  constraint language_practice_sessions_partner_chk check (
    learner_user_id <> partner_user_id
  ),
  constraint language_practice_sessions_target_language_chk check (
    target_language_code in ('en', 'fr', 'ru', 'zh')
  ),
  constraint language_practice_sessions_native_language_chk check (
    learner_native_language_code is null
    or learner_native_language_code in ('en', 'fr', 'ru', 'zh')
  ),
  constraint language_practice_sessions_level_chk check (
    target_language_level is null
    or target_language_level in ('a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'unsure')
  ),
  constraint language_practice_sessions_correction_chk check (
    correction_preference is null
    or correction_preference in ('no_corrections', 'light_corrections', 'active_corrections')
  ),
  constraint language_practice_sessions_mode_chk check (
    language_exchange_mode in ('practice_only', 'reciprocal_exchange', 'native_helper')
  ),
  constraint language_practice_sessions_status_chk check (
    status in ('active', 'ended')
  )
);

create unique index if not exists language_practice_sessions_active_pair_idx
  on public.language_practice_sessions (learner_user_id, partner_user_id)
  where status = 'active';

create index if not exists language_practice_sessions_active_lookup_idx
  on public.language_practice_sessions (learner_user_id, partner_user_id, updated_at desc)
  where status = 'active';

create index if not exists language_practice_sessions_partner_lookup_idx
  on public.language_practice_sessions (partner_user_id, learner_user_id, updated_at desc)
  where status = 'active';

comment on table public.language_practice_sessions is 'Durable chat-level context for language-practice conversations between a learner and a human or AI partner.';
comment on column public.language_practice_sessions.target_language_code is 'Language being practiced in this chat session.';
comment on column public.language_practice_sessions.learner_native_language_code is 'Learner native/help language snapshot at session start.';
comment on column public.language_practice_sessions.correction_preference is 'How much correction the learner wants during this session.';
comment on column public.language_practice_sessions.language_exchange_mode is 'Language exchange intent for this session.';
