-- Speed up LinkedAgents daily profile selection.
-- The automation only spotlights registered public profiles, excluding
-- temporary anonymous profiles and private profiles.
CREATE INDEX IF NOT EXISTS idx_profiles_linked_agents_public_registered
ON public.profiles (last_active DESC NULLS LAST, user_id)
WHERE is_private = false
  AND provider IS NOT NULL
  AND provider <> 'anonymous'
  AND slug IS NOT NULL
  AND displayname IS NOT NULL;
