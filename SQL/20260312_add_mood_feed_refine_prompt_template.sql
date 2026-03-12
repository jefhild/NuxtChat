alter table public.mood_feed_settings
add column if not exists refine_prompt_template text;

update public.mood_feed_settings
set refine_prompt_template = coalesce(
  nullif(refine_prompt_template, ''),
  'Rewrite the user''s response into a concise, direct, interesting mood-feed post.
Preserve the core meaning and target; do not soften or change intent.
Avoid cutesy metaphors, puns, or playful framing unless the tone explicitly calls for it.
It must clearly answer the prompt but should not repeat the user''s words.
Aim for 8-22 words. One or two short sentences max. Plain text only.
Sound human and natural. Avoid AI-ish phrasing, formulaic patterns, or over-clever slogans.
Prefer simple, specific, conversational wording over abstract or ornate phrasing.
Avoid quotes, hashtags, emojis, and punctuation spam.
If tone is ''serious'', be blunt, plain, and literal (no jokes or whimsy).
Language: {{locale}}.
Tone: {{tone}}.'
)
where id = 1;
