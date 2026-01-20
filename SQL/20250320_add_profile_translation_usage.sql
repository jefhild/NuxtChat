create table if not exists public.profile_translation_usage (
  id bigserial primary key,
  user_id uuid not null
    references profiles (user_id) on delete cascade,
  day date not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

create index if not exists profile_translation_usage_user_id_idx
  on public.profile_translation_usage (user_id);
