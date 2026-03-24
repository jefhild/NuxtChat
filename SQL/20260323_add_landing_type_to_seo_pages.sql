alter table public.seo_pages
  drop constraint if exists seo_pages_page_type_check;

alter table public.seo_pages
  add constraint seo_pages_page_type_check
  check (page_type in ('compare', 'guide', 'topic', 'landing'));
