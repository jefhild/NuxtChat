alter table public.seo_pages
  add column if not exists photo_credits_url text,
  add column if not exists photo_credits_html text;
