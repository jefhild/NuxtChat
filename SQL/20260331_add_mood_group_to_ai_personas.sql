-- Add mood_group column to ai_personas
-- Replaces the old article-based category_id grouping on the About page.
-- Valid values: bored | cant-sleep | want-advice | light-chat | lonely | sad | calm | curious
-- category_id is intentionally preserved for the articles/editorial pipeline.

alter table public.ai_personas
  add column if not exists mood_group text;

comment on column public.ai_personas.mood_group is
  'Mood-matching group for display on the About page and match UI. '
  'One of: bored, cant-sleep, want-advice, light-chat, lonely, sad, calm, curious';
