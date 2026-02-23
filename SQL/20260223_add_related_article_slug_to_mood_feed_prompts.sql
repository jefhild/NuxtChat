alter table if exists public.mood_feed_prompts
add column if not exists related_article_slug text null;

create index if not exists mood_feed_prompts_related_article_slug_idx
  on public.mood_feed_prompts (related_article_slug);
