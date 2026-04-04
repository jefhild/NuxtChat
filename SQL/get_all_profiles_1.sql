DROP FUNCTION IF EXISTS public.get_all_profiles_1(boolean);
DROP FUNCTION IF EXISTS public.get_all_profiles_1(boolean, integer, integer, text, text);

CREATE OR REPLACE FUNCTION public.get_all_profiles_1(
  p_is_ai boolean DEFAULT NULL,
  p_limit integer DEFAULT 5000,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL,
  p_filter text DEFAULT NULL
)
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
  provider text,
  avatar_url text,
  looking_for text[],
  site_url text,
  status text,
  status_id integer,
  is_ai boolean,
  force_online boolean,
  is_simulated boolean,
  manual_status text,
  last_seen_at timestamptz,
  marked_for_deletion_at timestamptz,
  slug text,
  persona_is_active boolean,
  created timestamptz,
  agent_enabled boolean,
  total_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT
      p.id,
      p.user_id,
      s.gender::text,
      p.gender_id,
      c.name::text AS country,
      c.emoji::text AS country_emoji,
      st.name::text AS state,
      ct.name::text AS city,
      p.displayname::text,
      p.tagline::text,
      p.bio::text,
      p.age,
      p.provider::text,
      p.avatar_url::text,
      array_agg(lf.name::text) FILTER (WHERE lf.name IS NOT NULL) AS looking_for,
      p.site_url::text,
      status.name::text AS status,
      p.status_id,
      p.is_ai,
      p.force_online,
      p.is_simulated,
      pr.manual_status::text,
      pr.last_seen_at::timestamptz,
      p.marked_for_deletion_at::timestamptz,
      MIN(p.slug)::text AS slug,
      bool_or(ap.is_active) AS persona_is_active,
      p.created::timestamptz AS created,
      p.agent_enabled
    FROM profiles p
    LEFT JOIN sex s ON p.gender_id = s.id
    LEFT JOIN countries c ON p.country_id = c.id
    LEFT JOIN states st ON p.state_id = st.id
    LEFT JOIN cities ct ON p.city_id = ct.id
    LEFT JOIN user_looking_for ulf ON p.user_id = ulf.user_id
    LEFT JOIN looking_for lf ON ulf.looking_for_id = lf.id
    LEFT JOIN status ON p.status_id = status.id
    LEFT JOIN presence pr ON pr.user_id = p.user_id
    LEFT JOIN ai_personas ap ON ap.profile_user_id = p.user_id
    WHERE (p_is_ai IS NULL OR p.is_ai = p_is_ai)
      AND (
        p_search IS NULL OR p_search = ''
        OR p.displayname ILIKE '%' || p_search || '%'
        OR p.slug ILIKE '%' || p_search || '%'
        OR p.tagline ILIKE '%' || p_search || '%'
      )
      AND (
        p_filter IS NULL OR p_filter = ''
        OR (p_filter = 'simulated' AND p.is_simulated = true)
        OR (p_filter = 'forced_online' AND p.force_online = true)
        OR (p_filter = 'anon_authenticated' AND p.provider = 'anonymous')
        OR (p_filter = 'authenticated' AND p.provider IS NOT NULL AND p.provider != 'anonymous')
        OR (p_filter = 'photos_pending' AND EXISTS (
          SELECT 1 FROM profile_photos pph
          WHERE pph.user_id = p.user_id AND pph.status = 'pending'
        ))
      )
    GROUP BY
      p.id, p.user_id, s.gender, p.gender_id, c.name, c.emoji, st.name, ct.name,
      p.displayname, p.tagline, p.bio, p.age, p.provider, p.avatar_url, p.site_url,
      status.name, p.status_id, p.is_ai, p.force_online, p.is_simulated,
      p.marked_for_deletion_at, p.created, p.agent_enabled,
      pr.manual_status, pr.last_seen_at
  )
  SELECT
    base.id,
    base.user_id,
    base.gender,
    base.gender_id,
    base.country,
    base.country_emoji,
    base.state,
    base.city,
    base.displayname,
    base.tagline,
    base.bio,
    base.age,
    base.provider,
    base.avatar_url,
    base.looking_for,
    base.site_url,
    base.status,
    base.status_id,
    base.is_ai,
    base.force_online,
    base.is_simulated,
    base.manual_status,
    base.last_seen_at,
    base.marked_for_deletion_at,
    base.slug,
    base.persona_is_active,
    base.created,
    base.agent_enabled,
    COUNT(*) OVER() AS total_count
  FROM base
  ORDER BY base.created DESC NULLS LAST
  LIMIT COALESCE(p_limit, 5000) OFFSET COALESCE(p_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_profiles_1(boolean, integer, integer, text, text) TO anon, authenticated;
