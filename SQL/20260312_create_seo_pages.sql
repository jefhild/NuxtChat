create extension if not exists pgcrypto;

create table if not exists public.seo_pages (
  id uuid primary key default gen_random_uuid(),
  page_type text not null check (page_type in ('compare', 'guide', 'topic')),
  locale text not null default 'en',
  slug text not null,
  title text not null,
  subtitle text,
  meta_title text,
  meta_description text,
  hero_title text,
  hero_body text,
  hero_image_path text,
  hero_image_url text,
  body text,
  highlights_json jsonb not null default '[]'::jsonb,
  faq_entry_ids_json jsonb not null default '[]'::jsonb,
  related_links_json jsonb not null default '[]'::jsonb,
  cta_label text not null default 'Start chatting',
  cta_href text not null default '/chat',
  is_published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint seo_pages_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint seo_pages_locale_check check (locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  constraint seo_pages_page_locale_slug_key unique (page_type, locale, slug)
);

create index if not exists seo_pages_page_type_idx
  on public.seo_pages (page_type, is_published, locale);

create index if not exists seo_pages_slug_idx
  on public.seo_pages (slug);
