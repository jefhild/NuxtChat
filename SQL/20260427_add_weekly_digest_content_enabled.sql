alter table public.weekly_digest_content
  add column if not exists enabled boolean not null default true;
