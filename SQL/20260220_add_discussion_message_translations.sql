create table if not exists public.discussion_message_translations (
  id bigserial primary key,
  message_id uuid not null
    references public.messages_v2 (id) on delete cascade,
  locale text not null,
  content text not null,
  source_locale text null,
  provider text null,
  translated_at timestamptz null,
  updated_at timestamptz not null default now(),
  unique (message_id, locale)
);

create index if not exists discussion_message_translations_message_id_idx
  on public.discussion_message_translations (message_id);

create index if not exists discussion_message_translations_locale_idx
  on public.discussion_message_translations (locale);
