create table if not exists public.mood_feed_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references public.profiles (user_id) on delete cascade,
  prompt_key text null,
  prompt_text text null,
  original_text text null,
  refined_text text null,
  source_locale text null,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mood_feed_entries_status_chk
    check (status in ('published', 'pending_validation', 'rejected'))
);

create index if not exists mood_feed_entries_user_id_idx
  on public.mood_feed_entries (user_id);
create index if not exists mood_feed_entries_status_idx
  on public.mood_feed_entries (status);
create index if not exists mood_feed_entries_created_at_idx
  on public.mood_feed_entries (created_at desc);

create table if not exists public.mood_feed_entry_translations (
  id bigserial primary key,
  entry_id uuid not null
    references public.mood_feed_entries (id) on delete cascade,
  locale text not null,
  refined_text text not null,
  source_locale text null,
  provider text null,
  translated_at timestamptz null,
  updated_at timestamptz not null default now(),
  unique (entry_id, locale)
);

create index if not exists mood_feed_entry_translations_entry_id_idx
  on public.mood_feed_entry_translations (entry_id);
create index if not exists mood_feed_entry_translations_locale_idx
  on public.mood_feed_entry_translations (locale);

create table if not exists public.mood_feed_replies (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null
    references public.mood_feed_entries (id) on delete cascade,
  user_id uuid not null
    references public.profiles (user_id) on delete cascade,
  reply_to_id uuid null
    references public.mood_feed_replies (id) on delete cascade,
  content text not null,
  source_locale text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mood_feed_replies_entry_id_idx
  on public.mood_feed_replies (entry_id);
create index if not exists mood_feed_replies_user_id_idx
  on public.mood_feed_replies (user_id);

create table if not exists public.mood_feed_reply_translations (
  id bigserial primary key,
  reply_id uuid not null
    references public.mood_feed_replies (id) on delete cascade,
  locale text not null,
  content text not null,
  source_locale text null,
  provider text null,
  translated_at timestamptz null,
  updated_at timestamptz not null default now(),
  unique (reply_id, locale)
);

create index if not exists mood_feed_reply_translations_reply_id_idx
  on public.mood_feed_reply_translations (reply_id);
create index if not exists mood_feed_reply_translations_locale_idx
  on public.mood_feed_reply_translations (locale);

insert into public.vote_target_types (type, description)
values
  ('mood_feed_entry', 'Votes on mood feed entries'),
  ('mood_feed_reply', 'Votes on mood feed replies')
on conflict (type) do nothing;

create or replace view public.mood_feed_entry_scores as
select
  v.target_id as entry_id,
  coalesce(sum(v.value), 0) as score,
  count(*) filter (where v.value = 1) as upvotes,
  count(*) filter (where v.value = -1) as downvotes
from public.votes_unified v
where v.target_type = 'mood_feed_entry'
group by v.target_id;

create or replace view public.mood_feed_reply_scores as
select
  v.target_id as reply_id,
  coalesce(sum(v.value), 0) as score,
  count(*) filter (where v.value = 1) as upvotes,
  count(*) filter (where v.value = -1) as downvotes
from public.votes_unified v
where v.target_type = 'mood_feed_reply'
group by v.target_id;

create or replace view public.mood_feed_reply_counts as
select
  entry_id,
  count(*)::int as reply_count
from public.mood_feed_replies
group by entry_id;
