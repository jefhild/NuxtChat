create table if not exists public.mood_feed_authors (
  user_id uuid primary key
    references auth.users (id) on delete cascade,
  displayname text null,
  avatar_url text null,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mood_feed_authors_is_anon_idx
  on public.mood_feed_authors (is_anonymous);

alter table public.mood_feed_entries
  drop constraint if exists mood_feed_entries_user_id_fkey;

alter table public.mood_feed_entries
  add constraint mood_feed_entries_user_id_fkey
    foreign key (user_id) references public.mood_feed_authors (user_id)
    on delete cascade;

alter table public.mood_feed_replies
  drop constraint if exists mood_feed_replies_user_id_fkey;

alter table public.mood_feed_replies
  add constraint mood_feed_replies_user_id_fkey
    foreign key (user_id) references public.mood_feed_authors (user_id)
    on delete cascade;
