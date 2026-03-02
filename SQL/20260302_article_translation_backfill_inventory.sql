-- Inventory and progress checks for article translation backfill.
-- Update the locale list in target_locales if needed.

-- 1) Missing translation counts by locale (published articles only).
with target_locales as (
  select unnest(array['en', 'fr', 'ru', 'zh'])::text as locale
),
published_articles as (
  select
    a.id,
    a.slug,
    coalesce(
      nullif(lower(split_part(a.original_language_code, '-', 1)), ''),
      'en'
    ) as source_locale
  from public.articles a
  where a.is_published = true
),
existing_translations as (
  select
    at.article_id,
    lower(split_part(at.locale, '-', 1)) as locale
  from public.article_translations at
)
select
  tl.locale as target_locale,
  count(*) as missing_articles
from published_articles p
cross join target_locales tl
left join existing_translations et
  on et.article_id = p.id
 and et.locale = tl.locale
where tl.locale <> p.source_locale
  and et.article_id is null
group by tl.locale
order by missing_articles desc, tl.locale;

-- 2) Backfill queue: one row per article with all missing target locales.
with target_locales as (
  select unnest(array['en', 'fr', 'ru', 'zh'])::text as locale
),
published_articles as (
  select
    a.id,
    a.slug,
    a.created_at,
    coalesce(
      nullif(lower(split_part(a.original_language_code, '-', 1)), ''),
      'en'
    ) as source_locale
  from public.articles a
  where a.is_published = true
),
existing_translations as (
  select
    at.article_id,
    lower(split_part(at.locale, '-', 1)) as locale
  from public.article_translations at
),
missing_pairs as (
  select
    p.id,
    p.slug,
    p.created_at,
    p.source_locale,
    tl.locale as missing_locale
  from published_articles p
  cross join target_locales tl
  left join existing_translations et
    on et.article_id = p.id
   and et.locale = tl.locale
  where tl.locale <> p.source_locale
    and et.article_id is null
)
select
  id as article_id,
  slug,
  source_locale,
  array_agg(missing_locale order by missing_locale) as missing_locales,
  count(*) as missing_locale_count,
  max(created_at) as article_created_at
from missing_pairs
group by id, slug, source_locale
order by missing_locale_count desc, article_created_at desc
limit 1000;

-- 3) Progress snapshot by locale (how many published-article translations exist).
select
  lower(split_part(at.locale, '-', 1)) as locale,
  count(*) as translation_rows
from public.article_translations at
join public.articles a on a.id = at.article_id
where a.is_published = true
group by 1
order by 2 desc, 1;
