-- FAQ tables: groups, topics, entries, and translations.
create table if not exists faq_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists faq_group_translations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references faq_groups(id) on delete cascade,
  locale text not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, locale)
);

create table if not exists faq_topics (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references faq_groups(id) on delete cascade,
  slug text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, slug)
);

create table if not exists faq_topic_translations (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references faq_topics(id) on delete cascade,
  locale text not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (topic_id, locale)
);

create table if not exists faq_entries (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references faq_topics(id) on delete cascade,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists faq_translations (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references faq_entries(id) on delete cascade,
  locale text not null,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entry_id, locale)
);

create index if not exists faq_topics_group_id_idx on faq_topics(group_id);
create index if not exists faq_entries_topic_id_idx on faq_entries(topic_id);
create index if not exists faq_group_translations_locale_idx on faq_group_translations(locale);
create index if not exists faq_topic_translations_locale_idx on faq_topic_translations(locale);
create index if not exists faq_translations_locale_idx on faq_translations(locale);

-- Seed starter FAQ content (en-US).
insert into faq_groups (slug, sort_order)
values
  ('getting-started', 1),
  ('chat-tools', 2),
  ('safety-privacy', 3),
  ('community', 4)
on conflict (slug) do nothing;

with groups as (
  select id, slug
  from faq_groups
  where slug in ('getting-started', 'chat-tools', 'safety-privacy', 'community')
)
insert into faq_group_translations (group_id, locale, title)
select id, 'en-US', initcap(replace(slug, '-', ' '))
from groups
on conflict (group_id, locale) do nothing;

with groups as (
  select id, slug
  from faq_groups
  where slug in ('getting-started', 'chat-tools', 'safety-privacy', 'community')
),
topic_seed as (
  select *
  from (
    values
      ('getting-started', 'profiles', 1),
      ('getting-started', 'onboarding', 2),
      ('chat-tools', 'ai-personas', 1),
      ('chat-tools', 'threads', 2),
      ('safety-privacy', 'anonymity', 1),
      ('safety-privacy', 'reporting', 2),
      ('community', 'guidelines', 1)
  ) as t(group_slug, slug, sort_order)
)
insert into faq_topics (group_id, slug, sort_order)
select g.id, t.slug, t.sort_order
from topic_seed t
join groups g on g.slug = t.group_slug
on conflict (group_id, slug) do nothing;

with topics as (
  select id, slug
  from faq_topics
  where slug in (
    'profiles',
    'onboarding',
    'ai-personas',
    'threads',
    'anonymity',
    'reporting',
    'guidelines'
  )
)
insert into faq_topic_translations (topic_id, locale, title)
select id, 'en-US', initcap(replace(slug, '-', ' '))
from topics
on conflict (topic_id, locale) do nothing;

insert into faq_entries (topic_id, sort_order)
select t.id, 1
from faq_topics t
where t.slug in (
  'profiles',
  'onboarding',
  'ai-personas',
  'threads',
  'anonymity',
  'reporting',
  'guidelines'
)
and not exists (
  select 1
  from faq_entries e
  where e.topic_id = t.id and e.sort_order = 1
);

insert into faq_translations (entry_id, locale, question, answer)
values
  (
    (
      select faq_entries.id
      from faq_entries
      join faq_topics on faq_entries.topic_id = faq_topics.id
      where faq_topics.slug = 'profiles' and faq_entries.sort_order = 1
      limit 1
    ),
    'en-US',
    'How do I update my profile details?',
    'Profile editing lives in Settings. Add a photo, update your tagline, and fine-tune what you want to share.'
  ),
  (
    (
      select faq_entries.id
      from faq_entries
      join faq_topics on faq_entries.topic_id = faq_topics.id
      where faq_topics.slug = 'onboarding' and faq_entries.sort_order = 1
      limit 1
    ),
    'en-US',
    'What happens when I first join?',
    'We guide you through a short onboarding flow to set preferences and match you with the right conversations.'
  ),
  (
    (
      select faq_entries.id
      from faq_entries
      join faq_topics on faq_entries.topic_id = faq_topics.id
      where faq_topics.slug = 'ai-personas' and faq_entries.sort_order = 1
      limit 1
    ),
    'en-US',
    'How do AI personas show up in chats?',
    'AI personas appear alongside real profiles with clear labels, so you can explore different conversation styles.'
  ),
  (
    (
      select faq_entries.id
      from faq_entries
      join faq_topics on faq_entries.topic_id = faq_topics.id
      where faq_topics.slug = 'threads' and faq_entries.sort_order = 1
      limit 1
    ),
    'en-US',
    'What are chat threads used for?',
    'Threads keep conversations organized around a topic, so you can revisit highlights and jump back in.'
  ),
  (
    (
      select faq_entries.id
      from faq_entries
      join faq_topics on faq_entries.topic_id = faq_topics.id
      where faq_topics.slug = 'anonymity' and faq_entries.sort_order = 1
      limit 1
    ),
    'en-US',
    'Can I stay anonymous on ImChatty?',
    'Yes. We keep registration lightweight and let you control how much personal info you reveal.'
  ),
  (
    (
      select faq_entries.id
      from faq_entries
      join faq_topics on faq_entries.topic_id = faq_topics.id
      where faq_topics.slug = 'reporting' and faq_entries.sort_order = 1
      limit 1
    ),
    'en-US',
    'How do I report a user or message?',
    'Use the report action on a message or profile. Reports go to the admin team for review.'
  ),
  (
    (
      select faq_entries.id
      from faq_entries
      join faq_topics on faq_entries.topic_id = faq_topics.id
      where faq_topics.slug = 'guidelines' and faq_entries.sort_order = 1
      limit 1
    ),
    'en-US',
    'What content is not allowed?',
    'We remove harassment, threats, or spam. The goal is a respectful, safe space for everyone.'
  )
on conflict (entry_id, locale) do nothing;
