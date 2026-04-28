create table if not exists public.weekly_digest_content (
  id uuid primary key default gen_random_uuid(),
  locale text not null,
  enabled boolean not null default true,
  title text,
  body text,
  cta_label text,
  cta_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_digest_content_locale_key unique (locale)
);

create index if not exists weekly_digest_content_locale_idx
  on public.weekly_digest_content (locale);
