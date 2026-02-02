create table if not exists public.mood_feed_flags (
  id bigserial primary key,
  target_type text not null,
  target_id uuid not null,
  user_id uuid not null
    references public.profiles (user_id) on delete cascade,
  reason text null,
  created_at timestamptz not null default now(),
  constraint mood_feed_flags_target_chk
    check (target_type in ('entry', 'reply'))
);

create index if not exists mood_feed_flags_target_idx
  on public.mood_feed_flags (target_type, target_id);
create index if not exists mood_feed_flags_user_id_idx
  on public.mood_feed_flags (user_id);
