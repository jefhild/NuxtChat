create table if not exists public.about_page_translations (
  id uuid primary key default gen_random_uuid(),
  section_key text not null,
  locale text not null,
  title text,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint about_page_translations_section_key_locale_key unique (section_key, locale)
);

create index if not exists about_page_translations_locale_idx
  on public.about_page_translations (locale);

