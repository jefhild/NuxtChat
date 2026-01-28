-- Recreate get_user_profile_by_slug with is_private in the result
DROP FUNCTION IF EXISTS public.get_user_profile_by_slug(text);

CREATE OR REPLACE FUNCTION public.get_user_profile_by_slug(p_slug text)
 RETURNS TABLE(
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
  is_private boolean
 )
 LANGUAGE plpgsql
AS $function$
begin
  return query
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
    p.is_private
  from profiles p
  left join sex s on p.gender_id = s.id
  left join countries c on p.country_id = c.id
  left join states st on p.state_id = st.id
  left join cities ct on p.city_id = ct.id
  left join user_looking_for ulf on p.user_id = ulf.user_id
  left join looking_for lf on ulf.looking_for_id = lf.id
  left join status on p.status_id = status.id
  where p.slug = p_slug
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
    p.is_private;
end;
$function$;
