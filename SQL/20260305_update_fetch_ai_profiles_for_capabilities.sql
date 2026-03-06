-- Align fetch_ai_profiles with ai_personas capability/listing controls.
-- This keeps AI profile discovery compatible with list_publicly and exposes
-- capability flags for client-side filtering/routing.

drop function if exists public.fetch_ai_profiles(uuid, integer, integer, integer, boolean);

create or replace function public.fetch_ai_profiles(
  logged_in_user_id uuid,
  gender_filter integer default null,
  min_age integer default null,
  max_age integer default null,
  is_ai_filter boolean default false
) returns table (
  profile_id uuid,
  user_id uuid,
  displayname text,
  tagline text,
  bio text,
  age integer,
  country_id integer,
  country_name text,
  state_name text,
  gender_id integer,
  provider text,
  avatar_url text,
  emoji text,
  upvotes_count integer,
  downvotes_count integer,
  is_favorite boolean,
  is_ai boolean,
  editorial_enabled boolean,
  counterpoint_enabled boolean,
  honey_enabled boolean,
  list_publicly boolean
) as $$
begin
  return query
  select
    p.id as profile_id,
    p.user_id,
    p.displayname,
    p.tagline,
    p.bio,
    p.age,
    p.country_id,
    c.name as country_name,
    s.name as state_name,
    p.gender_id,
    p.provider,
    p.avatar_url,
    c.emoji,
    p.upvotes_count,
    p.downvotes_count,
    case when f.favorite_user_id is not null then true else false end as is_favorite,
    p.is_ai,
    coalesce(ap.editorial_enabled, true) as editorial_enabled,
    coalesce(ap.counterpoint_enabled, true) as counterpoint_enabled,
    coalesce(ap.honey_enabled, false) as honey_enabled,
    coalesce(ap.list_publicly, true) as list_publicly
  from public.profiles p
  left join public.countries c on p.country_id = c.id
  left join public.states s on p.state_id = s.id
  left join public.favorites f
    on p.user_id = f.favorite_user_id
   and f.user_id = logged_in_user_id
  left join public.ai_personas ap
    on ap.profile_user_id = p.user_id
   and ap.is_active = true
  where p.user_id != logged_in_user_id
    and p.provider != 'anonymous'
    and (gender_filter is null or p.gender_id = gender_filter)
    and (min_age is null or p.age >= min_age)
    and (max_age is null or p.age <= max_age)
    and p.is_ai = is_ai_filter
    and (p.is_ai = false or coalesce(ap.list_publicly, true));
end;
$$ language plpgsql;
