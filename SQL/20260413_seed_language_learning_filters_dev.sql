-- =============================================================================
-- DEV SEED — language learning filters
--
-- Inserts temporary durable language preferences for profiles and matching
-- intakes so /language-practice has coverage across en/fr/ru/zh.
--
-- Safe-ish for dev: rerunning updates existing seed rows and inserts a fresh
-- match_intake snapshot for the current run.
--
-- Cleanup:
--   delete from public.match_intakes
--   where source_persona = 'seed-language-learning';
--
--   delete from public.profile_language_preferences
--   where source = 'seed';
-- =============================================================================

with profile_rows as (
  select
    p.user_id,
    p.is_ai,
    ap.persona_key,
    ap.honey_enabled,
    row_number() over (
      order by
        coalesce(p.is_ai, false),
        coalesce(ap.honey_enabled, false),
        p.user_id
    ) as rn
  from public.profiles p
  left join public.ai_personas ap
    on ap.profile_user_id = p.user_id
   and ap.is_active = true
),
seed_values as (
  select
    user_id,
    is_ai,
    persona_key,
    honey_enabled,
    (1 + ((rn - 1) % 8))::int as language_slot,
    (1 + ((rn - 1) % 7))::int as level_slot,
    (1 + ((rn - 1) % 3))::int as preference_slot
  from profile_rows
),
language_rows as (
  select
    user_id,
    is_ai,
    (array['en', 'fr', 'ru', 'zh', 'en', 'fr', 'ru', 'zh'])[language_slot] as native_language_code,
    case
      when is_ai then null
      else (array['fr', 'en', 'en', 'en', 'zh', 'ru', 'fr', 'ru'])[language_slot]
    end as target_language_code,
    case
      when is_ai then null
      else (array['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'unsure'])[level_slot]
    end as target_language_level,
    case
      when is_ai then 'active_corrections'
      else (array['no_corrections', 'light_corrections', 'active_corrections'])[preference_slot]
    end as correction_preference,
    case
      when is_ai then 'native_helper'
      else (array['practice_only', 'reciprocal_exchange', 'native_helper'])[preference_slot]
    end as language_exchange_mode
  from seed_values
),
upsert_preferences as (
  insert into public.profile_language_preferences (
    user_id,
    native_language_code,
    target_language_code,
    target_language_level,
    correction_preference,
    language_exchange_mode,
    is_active,
    is_primary,
    source,
    created_at,
    updated_at
  )
  select
    user_id,
    native_language_code,
    target_language_code,
    target_language_level,
    correction_preference,
    language_exchange_mode,
    true,
    true,
    'seed',
    now(),
    now()
  from language_rows
  on conflict (user_id) where is_active = true and is_primary = true
  do update set
    native_language_code = excluded.native_language_code,
    target_language_code = excluded.target_language_code,
    target_language_level = excluded.target_language_level,
    correction_preference = excluded.correction_preference,
    language_exchange_mode = excluded.language_exchange_mode,
    source = 'seed',
    updated_at = now()
  returning
    user_id,
    native_language_code,
    target_language_code,
    target_language_level,
    correction_preference,
    language_exchange_mode
),
latest as (
  select distinct on (user_id)
    *
  from public.match_intakes
  order by user_id, created_at desc
)
insert into public.match_intakes (
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
  native_language_code,
  target_language_code,
  target_language_level,
  correction_preference,
  language_exchange_mode,
  created_at
)
select
  up.user_id,
  coalesce(latest.emotion, 'curious'),
  coalesce(latest.intent, 'casual_chat'),
  coalesce(latest.energy, 'normal'),
  coalesce(latest.privacy, 'private_matching_only'),
  coalesce(latest.time_horizon, 'generally_lately'),
  latest.free_text_refined,
  coalesce(latest.topic_hint, 'general'),
  'seed-language-learning',
  coalesce(latest.locale, 'en-US'),
  coalesce(latest.confidence, 0.650),
  up.native_language_code,
  up.target_language_code,
  up.target_language_level,
  up.correction_preference,
  up.language_exchange_mode,
  now()
from upsert_preferences up
left join latest
  on latest.user_id = up.user_id;

with seeded_latest as (
  select distinct on (user_id)
    id,
    user_id,
    native_language_code,
    target_language_code,
    target_language_level,
    correction_preference,
    language_exchange_mode
  from public.match_intakes
  where source_persona = 'seed-language-learning'
  order by user_id, created_at desc
)
update public.match_requests mr
set
  intake_id = seeded_latest.id,
  native_language_code = seeded_latest.native_language_code,
  target_language_code = seeded_latest.target_language_code,
  target_language_level = seeded_latest.target_language_level,
  correction_preference = seeded_latest.correction_preference,
  language_exchange_mode = seeded_latest.language_exchange_mode
from seeded_latest
where mr.user_id = seeded_latest.user_id
  and mr.status = 'pending';

select
  p.is_ai,
  coalesce(ap.honey_enabled, false) as honey_enabled,
  plp.native_language_code,
  plp.target_language_code,
  plp.target_language_level,
  plp.correction_preference,
  plp.language_exchange_mode,
  count(*) as profiles
from public.profile_language_preferences_active plp
join public.profiles p
  on p.user_id = plp.user_id
left join public.ai_personas ap
  on ap.profile_user_id = p.user_id
group by
  p.is_ai,
  coalesce(ap.honey_enabled, false),
  plp.native_language_code,
  plp.target_language_code,
  plp.target_language_level,
  plp.correction_preference,
  plp.language_exchange_mode
order by
  p.is_ai,
  honey_enabled,
  plp.target_language_code,
  plp.native_language_code;
