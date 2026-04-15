alter table public.match_intakes
  add column if not exists native_language_code text null,
  add column if not exists target_language_code text null,
  add column if not exists target_language_level text null,
  add column if not exists correction_preference text null,
  add column if not exists language_exchange_mode text null;

alter table public.match_requests
  add column if not exists native_language_code text null,
  add column if not exists target_language_code text null,
  add column if not exists target_language_level text null,
  add column if not exists correction_preference text null,
  add column if not exists language_exchange_mode text null;

alter table public.match_intakes
  drop constraint if exists match_intakes_native_language_code_chk,
  drop constraint if exists match_intakes_target_language_code_chk,
  drop constraint if exists match_intakes_target_language_level_chk,
  drop constraint if exists match_intakes_correction_preference_chk,
  drop constraint if exists match_intakes_language_exchange_mode_chk;

alter table public.match_intakes
  add constraint match_intakes_native_language_code_chk check (
    native_language_code is null or native_language_code in ('en', 'fr', 'ru', 'zh')
  ),
  add constraint match_intakes_target_language_code_chk check (
    target_language_code is null or target_language_code in ('en', 'fr', 'ru', 'zh')
  ),
  add constraint match_intakes_target_language_level_chk check (
    target_language_level is null or target_language_level in ('a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'unsure')
  ),
  add constraint match_intakes_correction_preference_chk check (
    correction_preference is null or correction_preference in ('no_corrections', 'light_corrections', 'active_corrections')
  ),
  add constraint match_intakes_language_exchange_mode_chk check (
    language_exchange_mode is null or language_exchange_mode in ('practice_only', 'reciprocal_exchange', 'native_helper')
  );

alter table public.match_requests
  drop constraint if exists match_requests_native_language_code_chk,
  drop constraint if exists match_requests_target_language_code_chk,
  drop constraint if exists match_requests_target_language_level_chk,
  drop constraint if exists match_requests_correction_preference_chk,
  drop constraint if exists match_requests_language_exchange_mode_chk;

alter table public.match_requests
  add constraint match_requests_native_language_code_chk check (
    native_language_code is null or native_language_code in ('en', 'fr', 'ru', 'zh')
  ),
  add constraint match_requests_target_language_code_chk check (
    target_language_code is null or target_language_code in ('en', 'fr', 'ru', 'zh')
  ),
  add constraint match_requests_target_language_level_chk check (
    target_language_level is null or target_language_level in ('a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'unsure')
  ),
  add constraint match_requests_correction_preference_chk check (
    correction_preference is null or correction_preference in ('no_corrections', 'light_corrections', 'active_corrections')
  ),
  add constraint match_requests_language_exchange_mode_chk check (
    language_exchange_mode is null or language_exchange_mode in ('practice_only', 'reciprocal_exchange', 'native_helper')
  );

create index if not exists match_intakes_language_target_idx
  on public.match_intakes (target_language_code, native_language_code, created_at desc)
  where target_language_code is not null;

create index if not exists match_requests_language_target_idx
  on public.match_requests (status, target_language_code, native_language_code, expires_at)
  where target_language_code is not null;

create or replace view public.match_intakes_latest as
select distinct on (user_id)
  id,
  user_id,
  emotion,
  intent,
  energy,
  privacy,
  time_horizon,
  free_text_refined,
  topic_hint,
  source_persona,
  locale,
  confidence,
  created_at,
  native_language_code,
  target_language_code,
  target_language_level,
  correction_preference,
  language_exchange_mode
from public.match_intakes
order by user_id, created_at desc;

comment on column public.match_intakes.native_language_code is 'Language the user can comfortably use or offer help in for language exchange.';
comment on column public.match_intakes.target_language_code is 'Language the user wants to practice in this matching session.';
comment on column public.match_intakes.target_language_level is 'Self-reported target language level using CEFR-style values a1-c2 or unsure.';
comment on column public.match_intakes.correction_preference is 'How much correction the user wants during language practice.';
comment on column public.match_intakes.language_exchange_mode is 'Language exchange intent for this matching session.';

comment on column public.match_requests.native_language_code is 'Denormalized native language from the intake for language-aware queue filtering.';
comment on column public.match_requests.target_language_code is 'Denormalized target practice language from the intake for language-aware queue filtering.';
comment on column public.match_requests.target_language_level is 'Denormalized target level from the intake for language-aware queue filtering.';
comment on column public.match_requests.correction_preference is 'Denormalized correction preference from the intake.';
comment on column public.match_requests.language_exchange_mode is 'Denormalized language exchange intent for the active request.';
