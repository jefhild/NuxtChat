-- Diagnostic SQL for language-practice AI personas.
--
-- Safe to run: this file only reads data. It helps distinguish:
-- 1. AI personas that are actually deleted.
-- 2. AI personas that exist but are inactive/private/not public.
-- 3. AI personas that have profile language preferences but do not have
--    metadata.language_practice.enabled = true, which is what the admin
--    Language Practice filter and /language-practice AI listing use.

-- Summary counts.
select
  count(*) as ai_personas_total,
  count(*) filter (
    where coalesce((ap.metadata->'language_practice'->>'enabled')::boolean, false)
  ) as language_practice_enabled_total,
  count(*) filter (
    where ap.metadata ? 'language_practice'
  ) as language_practice_metadata_present_total,
  count(*) filter (
    where
      coalesce((ap.metadata->'language_practice'->>'enabled')::boolean, false)
      and ap.is_active
      and ap.list_publicly
      and p.is_ai
      and not coalesce(p.is_private, false)
  ) as active_public_language_practice_total
from public.ai_personas ap
left join public.profiles p
  on p.user_id = ap.profile_user_id;

-- Personas that currently have a language_practice metadata block.
select
  ap.id,
  ap.persona_key,
  p.displayname,
  ap.is_active,
  ap.list_publicly,
  ap.honey_enabled,
  p.is_ai as profile_is_ai,
  p.is_private as profile_is_private,
  coalesce((ap.metadata->'language_practice'->>'enabled')::boolean, false)
    as language_practice_enabled,
  ap.metadata->'language_practice' as language_practice_metadata,
  ap.updated_at
from public.ai_personas ap
left join public.profiles p
  on p.user_id = ap.profile_user_id
where ap.metadata ? 'language_practice'
order by ap.updated_at desc;

-- AI profiles with active profile-level language preferences.
-- These do not make a bot a language-practice AI persona by themselves.
select
  ap.id,
  ap.persona_key,
  p.displayname,
  ap.is_active,
  ap.list_publicly,
  ap.honey_enabled,
  p.is_private as profile_is_private,
  coalesce((ap.metadata->'language_practice'->>'enabled')::boolean, false)
    as language_practice_enabled,
  plp.native_language_code,
  plp.target_language_code,
  plp.target_language_level,
  plp.correction_preference,
  plp.language_exchange_mode,
  plp.source,
  plp.updated_at as preference_updated_at
from public.profile_language_preferences plp
join public.profiles p
  on p.user_id = plp.user_id
left join public.ai_personas ap
  on ap.profile_user_id = p.user_id
where p.is_ai
  and plp.is_active
order by
  language_practice_enabled desc,
  plp.source,
  p.displayname;

-- Recovery template:
-- Uncomment and edit the values before running. This enables language practice
-- on selected existing AI personas without deleting or recreating rows.
--
-- update public.ai_personas ap
-- set
--   metadata = jsonb_set(
--     coalesce(ap.metadata, '{}'::jsonb),
--     '{language_practice}',
--     jsonb_build_object(
--       'enabled', true,
--       'assistant_role', 'conversation_partner',
--       'supported_target_languages', to_jsonb(array['fr']::text[]),
--       'supported_native_languages', to_jsonb(array['en']::text[]),
--       'supported_levels', to_jsonb(array['a1', 'a2', 'b1', 'b2']::text[]),
--       'default_correction_preference', 'light_corrections',
--       'default_exchange_mode', 'practice_only',
--       'system_prompt_template', null,
--       'response_style_template', null
--     ),
--     true
--   ),
--   is_active = true,
--   list_publicly = true,
--   updated_at = now()
-- where ap.persona_key = 'replace-with-persona-key';
