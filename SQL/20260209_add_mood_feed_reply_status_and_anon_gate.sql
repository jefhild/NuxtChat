alter table public.mood_feed_replies
  add column if not exists status text not null default 'published';

alter table public.mood_feed_replies
  drop constraint if exists mood_feed_replies_status_chk;

alter table public.mood_feed_replies
  add constraint mood_feed_replies_status_chk
    check (status in ('published', 'pending_validation', 'rejected'));

create index if not exists mood_feed_replies_status_idx
  on public.mood_feed_replies (status);

create table if not exists public.mood_feed_anon_gate (
  user_id uuid primary key,
  captcha_verified_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mood_feed_anon_gate_captcha_idx
  on public.mood_feed_anon_gate (captcha_verified_at);

create or replace view public.mood_feed_reply_counts as
select
  entry_id,
  count(*)::int as reply_count
from public.mood_feed_replies
where status = 'published'
group by entry_id;
