create table if not exists public.mood_feed_prompts (
  id bigserial primary key,
  prompt_key text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mood_feed_prompt_translations (
  id bigserial primary key,
  prompt_id bigint not null
    references public.mood_feed_prompts (id) on delete cascade,
  locale text not null,
  prompt_text text not null,
  source_locale text null,
  updated_at timestamptz not null default now(),
  unique (prompt_id, locale)
);

create index if not exists mood_feed_prompt_translations_prompt_id_idx
  on public.mood_feed_prompt_translations (prompt_id);
create index if not exists mood_feed_prompt_translations_locale_idx
  on public.mood_feed_prompt_translations (locale);

create table if not exists public.mood_feed_skips (
  id bigserial primary key,
  user_id uuid not null
    references public.profiles (user_id) on delete cascade,
  skipped_at timestamptz not null default now()
);

create index if not exists mood_feed_skips_user_id_idx
  on public.mood_feed_skips (user_id);
create index if not exists mood_feed_skips_skipped_at_idx
  on public.mood_feed_skips (skipped_at desc);

insert into public.mood_feed_prompts (prompt_key)
values
  ('morning_scream'),
  ('tiny_ruin'),
  ('never_hear'),
  ('feel_seen'),
  ('daily_annoyance')
on conflict (prompt_key) do nothing;

-- English
insert into public.mood_feed_prompt_translations (prompt_id, locale, prompt_text, source_locale)
select id, 'en', prompt_text, 'en'
from (
  values
    ('morning_scream', 'When you get up in the morning, what makes you scream?'),
    ('tiny_ruin', 'What tiny thing ruins your mood instantly?'),
    ('never_hear', 'What sound do you wish you never had to hear again?'),
    ('feel_seen', 'What always makes you feel seen?'),
    ('daily_annoyance', 'What’s your biggest daily annoyance?')
) as t(prompt_key, prompt_text)
join public.mood_feed_prompts p on p.prompt_key = t.prompt_key
on conflict (prompt_id, locale) do nothing;

-- French
insert into public.mood_feed_prompt_translations (prompt_id, locale, prompt_text, source_locale)
select id, 'fr', prompt_text, 'en'
from (
  values
    ('morning_scream', 'Au réveil, qu’est-ce qui te fait crier ?'),
    ('tiny_ruin', 'Quel petit détail te gâche instantanément la journée ?'),
    ('never_hear', 'Quel bruit voudrais-tu ne plus jamais entendre ?'),
    ('feel_seen', 'Qu’est-ce qui te fait te sentir vraiment compris·e ?'),
    ('daily_annoyance', 'Quelle petite contrariété te colle tous les jours ?')
) as t(prompt_key, prompt_text)
join public.mood_feed_prompts p on p.prompt_key = t.prompt_key
on conflict (prompt_id, locale) do nothing;

-- Russian
insert into public.mood_feed_prompt_translations (prompt_id, locale, prompt_text, source_locale)
select id, 'ru', prompt_text, 'en'
from (
  values
    ('morning_scream', 'Когда просыпаешься, что заставляет тебя кричать?'),
    ('tiny_ruin', 'Какая мелочь мгновенно портит настроение?'),
    ('never_hear', 'Какой звук ты хотел(а) бы никогда не слышать?'),
    ('feel_seen', 'Что заставляет тебя чувствовать себя понятым(ой)?'),
    ('daily_annoyance', 'Какая ежедневная мелочь тебя бесит?')
) as t(prompt_key, prompt_text)
join public.mood_feed_prompts p on p.prompt_key = t.prompt_key
on conflict (prompt_id, locale) do nothing;

-- Chinese
insert into public.mood_feed_prompt_translations (prompt_id, locale, prompt_text, source_locale)
select id, 'zh', prompt_text, 'en'
from (
  values
    ('morning_scream', '早上起床时，什么让你想尖叫？'),
    ('tiny_ruin', '什么小事会瞬间毁掉你的心情？'),
    ('never_hear', '你最不想再听到的声音是什么？'),
    ('feel_seen', '什么会让你觉得被真正理解？'),
    ('daily_annoyance', '你每天最烦的一件小事是什么？')
) as t(prompt_key, prompt_text)
join public.mood_feed_prompts p on p.prompt_key = t.prompt_key
on conflict (prompt_id, locale) do nothing;
