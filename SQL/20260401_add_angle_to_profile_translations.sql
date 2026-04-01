-- Add angle column to profile_translations for AI persona angle/summary translations.
-- This allows the angle/summary field from ai_personas to be translated per locale
-- and stored alongside the profile's other translated fields (displayname, bio, tagline).

ALTER TABLE public.profile_translations
  ADD COLUMN IF NOT EXISTS angle TEXT NULL;
