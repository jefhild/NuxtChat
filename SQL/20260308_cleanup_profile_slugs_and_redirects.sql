-- Normalize legacy profile slugs and preserve old URLs via redirect mapping.
-- This migration:
-- 1) creates a redirect map table for old->new profile slugs
-- 2) normalizes malformed/empty slugs on public.profiles
-- 3) updates get_user_profile_by_slug() to resolve legacy slugs transparently

create table if not exists public.profile_slug_redirects (
  old_slug text primary key,
  new_slug text not null,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists profile_slug_redirects_user_id_idx
  on public.profile_slug_redirects (user_id);

create index if not exists profile_slug_redirects_new_slug_idx
  on public.profile_slug_redirects (new_slug);

do $$
declare
  rec record;
  base_slug text;
  candidate_slug text;
  suffix integer;
begin
  for rec in
    select
      p.id,
      p.user_id,
      p.displayname,
      p.slug as current_slug
    from public.profiles p
    where
      p.slug is null
      or btrim(p.slug) = ''
      or lower(p.slug) !~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$'
  loop
    base_slug := lower(coalesce(rec.current_slug, rec.displayname, ''));
    base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
    base_slug := regexp_replace(base_slug, '-{2,}', '-', 'g');
    base_slug := regexp_replace(base_slug, '(^-+)|(-+$)', '', 'g');

    if base_slug is null or base_slug = '' then
      base_slug := 'user';
    end if;

    candidate_slug := base_slug;
    suffix := 2;

    while exists (
      select 1
      from public.profiles p2
      where p2.slug = candidate_slug
        and p2.id <> rec.id
    ) loop
      candidate_slug := base_slug || '-' || suffix::text;
      suffix := suffix + 1;
    end loop;

    if rec.current_slug is not null
       and btrim(rec.current_slug) <> ''
       and rec.current_slug <> candidate_slug then
      insert into public.profile_slug_redirects (old_slug, new_slug, user_id)
      values (rec.current_slug, candidate_slug, rec.user_id)
      on conflict (old_slug) do update
        set new_slug = excluded.new_slug,
            user_id = excluded.user_id;
    end if;

    update public.profiles
    set slug = candidate_slug
    where id = rec.id;
  end loop;
end $$;

drop function if exists public.get_user_profile_by_slug(text);

create or replace function public.get_user_profile_by_slug(p_slug text)
 returns table(
  id uuid,
  user_id uuid,
  gender text,
  gender_id integer,
  country text,
  country_emoji text,
  state text,
  city text,
  displayname text,
  tagline text,
  bio text,
  age integer,
  slug text,
  provider text,
  avatar_url text,
  looking_for text[],
  site_url text,
  status text,
  status_id integer,
  is_ai boolean,
  preferred_locale text,
  profile_card_theme text,
  is_private boolean
 )
 language plpgsql
as $function$
begin
  return query
  with resolved as (
    select coalesce(
      (
        select r.new_slug
        from public.profile_slug_redirects r
        where r.old_slug = p_slug
        limit 1
      ),
      p_slug
    ) as slug
  )
  select
    p.id,
    p.user_id,
    s.gender::text,
    p.gender_id,
    c.name::text as country,
    c.emoji::text as country_emoji,
    st.name::text as state,
    ct.name::text as city,
    p.displayname::text,
    p.tagline::text,
    p.bio::text,
    p.age,
    p.slug,
    p.provider::text,
    p.avatar_url::text,
    array_agg(lf.name::text) as looking_for,
    p.site_url::text,
    status.name::text as status,
    p.status_id,
    p.is_ai,
    p.preferred_locale,
    p.profile_card_theme,
    p.is_private
  from profiles p
  left join sex s on p.gender_id = s.id
  left join countries c on p.country_id = c.id
  left join states st on p.state_id = st.id
  left join cities ct on p.city_id = ct.id
  left join user_looking_for ulf on p.user_id = ulf.user_id
  left join looking_for lf on ulf.looking_for_id = lf.id
  left join status on p.status_id = status.id
  cross join resolved
  where p.slug = resolved.slug
  group by
    p.id,
    p.user_id,
    s.gender,
    p.gender_id,
    c.name,
    c.emoji,
    st.name,
    ct.name,
    p.displayname,
    p.tagline,
    p.bio,
    p.age,
    p.slug,
    p.provider,
    p.avatar_url,
    p.site_url,
    status.name,
    p.status_id,
    p.is_ai,
    p.preferred_locale,
    p.profile_card_theme,
    p.is_private;
end;
$function$;
