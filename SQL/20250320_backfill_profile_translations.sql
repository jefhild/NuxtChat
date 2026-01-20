insert into public.profile_translations (
  user_id,
  locale,
  displayname,
  bio,
  tagline,
  source_locale,
  provider,
  updated_at
)
select
  p.user_id,
  coalesce(nullif(trim(p.preferred_locale), ''), 'en') as locale,
  p.displayname,
  p.bio,
  p.tagline,
  coalesce(nullif(trim(p.preferred_locale), ''), 'en') as source_locale,
  'backfill' as provider,
  now() as updated_at
from public.profiles p
where p.user_id is not null
  and (p.displayname is not null or p.bio is not null or p.tagline is not null)
on conflict (user_id, locale) do update
set
  displayname = excluded.displayname,
  bio = excluded.bio,
  tagline = excluded.tagline,
  source_locale = excluded.source_locale,
  provider = 'backfill',
  updated_at = now();
