-- =============================================================================
-- Durable language-learning preferences
--
-- profile_language_preferences is the durable source of truth for language
-- exchange capabilities and goals. match_intakes can snapshot these values for
-- a specific matching session, but should not be the only place they live.
-- =============================================================================

create table if not exists public.profile_language_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,

  native_language_code text null,
  target_language_code text null,
  target_language_level text null,
  correction_preference text null,
  language_exchange_mode text not null default 'practice_only',

  is_active boolean not null default true,
  is_primary boolean not null default true,
  source text not null default 'profile_settings',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profile_language_preferences_native_language_code_chk check (
    native_language_code is null or native_language_code in ('en', 'fr', 'ru', 'zh')
  ),
  constraint profile_language_preferences_target_language_code_chk check (
    target_language_code is null or target_language_code in ('en', 'fr', 'ru', 'zh')
  ),
  constraint profile_language_preferences_target_language_level_chk check (
    target_language_level is null or target_language_level in ('a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'unsure')
  ),
  constraint profile_language_preferences_correction_preference_chk check (
    correction_preference is null or correction_preference in ('no_corrections', 'light_corrections', 'active_corrections')
  ),
  constraint profile_language_preferences_language_exchange_mode_chk check (
    language_exchange_mode in ('practice_only', 'reciprocal_exchange', 'native_helper')
  ),
  constraint profile_language_preferences_source_chk check (
    source in ('user_onboarding', 'profile_settings', 'ai_persona', 'match_intake_backfill', 'seed', 'admin')
  ),
  constraint profile_language_preferences_has_language_chk check (
    native_language_code is not null or target_language_code is not null
  )
);

create unique index if not exists profile_language_preferences_one_primary_idx
  on public.profile_language_preferences (user_id)
  where is_active = true and is_primary = true;

create unique index if not exists profile_language_preferences_pair_idx
  on public.profile_language_preferences (
    user_id,
    coalesce(native_language_code, ''),
    coalesce(target_language_code, '')
  )
  where is_active = true;

create index if not exists profile_language_preferences_target_idx
  on public.profile_language_preferences (
    target_language_code,
    native_language_code,
    is_active
  )
  where is_active = true;

create index if not exists profile_language_preferences_user_updated_idx
  on public.profile_language_preferences (user_id, updated_at desc);

create or replace view public.profile_language_preferences_active as
select distinct on (user_id)
  id,
  user_id,
  native_language_code,
  target_language_code,
  target_language_level,
  correction_preference,
  language_exchange_mode,
  is_primary,
  source,
  created_at,
  updated_at
from public.profile_language_preferences
where is_active = true
order by user_id, is_primary desc, updated_at desc, created_at desc;

insert into public.profile_language_preferences (
  user_id,
  native_language_code,
  target_language_code,
  target_language_level,
  correction_preference,
  language_exchange_mode,
  is_primary,
  source,
  created_at,
  updated_at
)
select
  mi.user_id,
  mi.native_language_code,
  mi.target_language_code,
  mi.target_language_level,
  mi.correction_preference,
  coalesce(mi.language_exchange_mode, 'practice_only'),
  true,
  'match_intake_backfill',
  now(),
  now()
from public.match_intakes_latest mi
where (mi.native_language_code is not null or mi.target_language_code is not null)
  and not exists (
    select 1
    from public.profile_language_preferences plp
    where plp.user_id = mi.user_id
      and plp.is_active = true
      and plp.is_primary = true
  );

comment on table public.profile_language_preferences is 'Durable language-learning preferences for real users and AI profile users. match_intakes can snapshot these values for a session.';
comment on view public.profile_language_preferences_active is 'Primary active language-learning preference per profile user.';
comment on column public.profile_language_preferences.native_language_code is 'Language the profile can comfortably use or help others practice.';
comment on column public.profile_language_preferences.target_language_code is 'Language the profile wants to practice, if any.';
comment on column public.profile_language_preferences.target_language_level is 'Self-reported target language level using CEFR-style values a1-c2 or unsure.';
comment on column public.profile_language_preferences.correction_preference is 'How much correction the profile prefers during language practice.';
comment on column public.profile_language_preferences.language_exchange_mode is 'Language exchange intent for this profile preference.';
