-- Add per-user Mood Feed prompt preferences
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mood_feed_prompt_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mood_feed_prompt_snooze_until TIMESTAMPTZ NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mood_feed_prompt_last_shown_at TIMESTAMPTZ NULL;
