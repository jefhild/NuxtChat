-- =============================================================================
-- DEV SEED — match_intakes
--
-- Inserts a fresh match_intake for every real (non-AI) user that doesn't
-- already have one created in the last 24 hours. Each row gets a random
-- emotion / intent / energy so the scoring algorithm always has candidates
-- to work with regardless of who is logged in.
--
-- Safe to run multiple times: the WHERE filter prevents duplicate seeding
-- within the same 24-hour window. Remove the NOT IN clause to force a full
-- re-seed.
--
-- Run in the Supabase SQL editor or via psql.
-- =============================================================================

INSERT INTO public.match_intakes (
  user_id,
  emotion,
  intent,
  energy,
  privacy,
  time_horizon,
  source_persona
)
SELECT
  p.user_id,
  (ARRAY[
    'lonely', 'calm', 'annoyed', 'overwhelmed',
    'playful', 'curious', 'hopeful', 'sad'
  ])[floor(random() * 8 + 1)::int] AS emotion,

  (ARRAY[
    'be_heard', 'listen', 'distract_me',
    'deep_talk', 'casual_chat', 'meet_someone_similar'
  ])[floor(random() * 6 + 1)::int] AS intent,

  (ARRAY[
    'drained', 'normal', 'wired'
  ])[floor(random() * 3 + 1)::int] AS energy,

  'private_matching_only'          AS privacy,
  'right_now'                      AS time_horizon,
  'seed'                           AS source_persona

FROM public.profiles p
WHERE p.is_ai = false
  -- Skip users who already have a recent intake so we don't flood the table
  AND p.user_id NOT IN (
    SELECT user_id
    FROM public.match_intakes
    WHERE created_at > now() - interval '24 hours'
  )
LIMIT 50;

-- -----------------------------------------------------------------------------
-- Seed AI persona users
--
-- AI personas get fixed intents based on persona_key name patterns so their
-- match scores reflect their actual purpose. Falls back to a spread of
-- complementary intents for unrecognised keys.
-- -----------------------------------------------------------------------------
INSERT INTO public.match_intakes (
  user_id,
  emotion,
  intent,
  energy,
  privacy,
  time_horizon,
  source_persona
)
SELECT
  ap.profile_user_id,

  -- Assign a plausible emotion based on persona_key hints
  CASE
    WHEN ap.persona_key ILIKE '%calm%'    OR ap.persona_key ILIKE '%quiet%'   THEN 'calm'
    WHEN ap.persona_key ILIKE '%deep%'    OR ap.persona_key ILIKE '%talk%'    THEN 'curious'
    WHEN ap.persona_key ILIKE '%fun%'     OR ap.persona_key ILIKE '%playful%' THEN 'playful'
    WHEN ap.persona_key ILIKE '%listen%'  OR ap.persona_key ILIKE '%support%' THEN 'lonely'
    WHEN ap.persona_key ILIKE '%hope%'    OR ap.persona_key ILIKE '%bright%'  THEN 'hopeful'
    -- Spread remaining personas evenly across the emotion set
    ELSE (ARRAY['calm', 'curious', 'hopeful', 'playful'])[
           (row_number() OVER (ORDER BY ap.persona_key) % 4 + 1)::int]
  END AS emotion,

  -- Assign an intent that reflects what this AI is best at
  CASE
    WHEN ap.persona_key ILIKE '%listen%'  OR ap.persona_key ILIKE '%support%' THEN 'listen'
    WHEN ap.persona_key ILIKE '%deep%'    OR ap.persona_key ILIKE '%talk%'    THEN 'deep_talk'
    WHEN ap.persona_key ILIKE '%fun%'     OR ap.persona_key ILIKE '%distract%' THEN 'distract_me'
    WHEN ap.persona_key ILIKE '%meet%'    OR ap.persona_key ILIKE '%social%'  THEN 'meet_someone_similar'
    WHEN ap.persona_key ILIKE '%casual%'  OR ap.persona_key ILIKE '%chat%'    THEN 'casual_chat'
    -- Spread remaining across listener-friendly intents (AIs are good listeners)
    ELSE (ARRAY['listen', 'casual_chat', 'deep_talk', 'listen', 'distract_me', 'casual_chat'])[
           (row_number() OVER (ORDER BY ap.persona_key) % 6 + 1)::int]
  END AS intent,

  'normal'                         AS energy,
  'private_matching_only'          AS privacy,
  'generally_lately'               AS time_horizon,  -- AIs are always available
  'seed'                           AS source_persona

FROM public.ai_personas ap
WHERE ap.is_active = true
  AND ap.profile_user_id IS NOT NULL
  AND ap.profile_user_id NOT IN (
    SELECT user_id
    FROM public.match_intakes
    WHERE created_at > now() - interval '24 hours'
  );

-- Quick check — show distribution of seeded values
SELECT
  mi.source_persona,
  p.is_ai,
  mi.emotion,
  mi.intent,
  count(*) AS users
FROM public.match_intakes_latest mi
JOIN public.profiles p ON p.user_id = mi.user_id
WHERE mi.source_persona = 'seed'
GROUP BY mi.source_persona, p.is_ai, mi.emotion, mi.intent
ORDER BY p.is_ai, mi.intent, mi.emotion;
