create table if not exists public.profile_translations (
  id bigserial primary key,
  user_id uuid not null
    references profiles (user_id) on delete cascade,
  locale text not null,
  displayname text null,
  bio text null,
  tagline text null,
  source_locale text null,
  provider text null,
  translated_at timestamptz null,
  updated_at timestamptz not null default now(),
  unique (user_id, locale)
);

create index if not exists profile_translations_user_id_idx
  on public.profile_translations (user_id);
