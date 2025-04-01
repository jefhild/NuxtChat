--PLPGSQL function to delete anonymous users
CREATE OR REPLACE FUNCTION delete_anonymous_users()
RETURNS VOID AS $$
BEGIN
	DELETE FROM auth.users
	WHERE is_anonymous = true;
END;
$$ LANGUAGE plpgsql;

--PLPGSQL function to delete all inactive anonymous users
CREATE OR REPLACE FUNCTION delete_inactive_anonymous_users()
RETURNS VOID AS $$
BEGIN
	DELETE FROM auth.users
	WHERE is_anonymous = true
	AND last_active_at < NOW() - INTERVAL '1 hour';
END;
$$LANGUAGE plpgsql;

--PLPGSQL function to downvote a user
CREATE OR REPLACE FUNCTION downvote_profile(
  target_user_id UUID,
  voter_user_id UUID
) RETURNS VOID AS $$
DECLARE
  existing_vote_type TEXT;
BEGIN
  -- Check for existing vote
  SELECT vote_type INTO existing_vote_type
  FROM votes
  WHERE profile_id = (SELECT id FROM profiles WHERE user_id = target_user_id)
	AND user_id = voter_user_id;

  IF existing_vote_type = 'upvote' THEN
	-- Reverse the existing upvote
	UPDATE votes
	SET vote_type = 'downvote'
	WHERE profile_id = (SELECT id FROM profiles WHERE user_id = target_user_id)
	  AND user_id = voter_user_id;

	UPDATE profiles
	SET upvotes_count = upvotes_count - 1,
		downvotes_count = downvotes_count + 1
	WHERE user_id = target_user_id;

  ELSIF existing_vote_type IS NULL THEN
	-- Insert new downvote
	INSERT INTO votes (profile_id, user_id, vote_type)
	VALUES ((SELECT id FROM profiles WHERE user_id = target_user_id), voter_user_id, 'downvote')
	ON CONFLICT (user_id, profile_id) DO NOTHING;

	UPDATE profiles
	SET downvotes_count = downvotes_count + 1
	WHERE user_id = target_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

--PLPGSQL function to upvote a user
CREATE OR REPLACE FUNCTION upvote_profile(
  target_user_id UUID,
  voter_user_id UUID
) RETURNS VOID AS $$
DECLARE
  existing_vote_type TEXT;
BEGIN
  -- Check for existing vote
  SELECT vote_type INTO existing_vote_type
  FROM votes
  WHERE profile_id = (SELECT id FROM profiles WHERE user_id = target_user_id)
	AND user_id = voter_user_id;

  IF existing_vote_type = 'downvote' THEN
	-- Reverse the existing downvote
	UPDATE votes
	SET vote_type = 'upvote'
	WHERE profile_id = (SELECT id FROM profiles WHERE user_id = target_user_id)
	  AND user_id = voter_user_id;

	UPDATE profiles
	SET upvotes_count = upvotes_count + 1,
		downvotes_count = downvotes_count - 1
	WHERE user_id = target_user_id;

  ELSIF existing_vote_type IS NULL THEN
	-- Insert new upvote
	INSERT INTO votes (profile_id, user_id, vote_type)
	VALUES ((SELECT id FROM profiles WHERE user_id = target_user_id), voter_user_id, 'upvote')
	ON CONFLICT (user_id, profile_id) DO NOTHING;

	UPDATE profiles
	SET upvotes_count = upvotes_count + 1
	WHERE user_id = target_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

--PLPGSQL function to fetch active chats
CREATE OR REPLACE FUNCTION fetch_active_chats(logged_in_user_id uuid)
RETURNS TABLE (
	user_id UUID,
	displayname TEXT,
	avatar_url TEXT,
	unread_count INTEGER,
	country_name TEXT,
	state_name TEXT,
	gender_id INTEGER,
	provider TEXT,
	age INTEGER,
	emoji TEXT,
	upvotes_count INTEGER,
	downvotes_count INTEGER,
	tagline TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
	p.user_id,
	p.displayname,
	p.avatar_url,
	COALESCE(unread_counts.unread_count::integer, 0) AS unread_count,
	c.name AS country_name,
	s.name AS state_name,
	CAST(p.gender_id AS INTEGER) AS gender_id,
	p.provider,
	p.age,
	c.emoji,
	p.upvotes_count, 
	p.downvotes_count, 
	p.tagline
  FROM profiles p
  LEFT JOIN (
	SELECT 
	  m.sender_id AS user_id,
	  COUNT(*) AS unread_count
	FROM messages m
	WHERE m.receiver_id = logged_in_user_id
	  AND m.read = false
	GROUP BY m.sender_id
  ) unread_counts ON p.user_id = unread_counts.user_id
  LEFT JOIN countries c ON p.country_id = c.id
  LEFT JOIN states s ON p.state_id = s.id
  WHERE p.user_id IN (
	SELECT DISTINCT
	  CASE
		WHEN m.sender_id = logged_in_user_id THEN m.receiver_id
		ELSE m.sender_id
	  END
	FROM messages m
	WHERE (m.sender_id = logged_in_user_id OR m.receiver_id = logged_in_user_id)
	  AND m.sender_id NOT IN (
		SELECT b.blocked_user_id
		FROM blocked_users b
		WHERE b.user_id = logged_in_user_id
	  )
	  AND m.receiver_id NOT IN (
		SELECT b.blocked_user_id
		FROM blocked_users b
		WHERE b.user_id = logged_in_user_id
	  )
  );
END;
$$ LANGUAGE plpgsql;

--PLPGSQL function to fetch AI profiles
CREATE OR REPLACE FUNCTION fetch_ai_profiles(
	logged_in_user_id UUID,
	gender_filter INTEGER DEFAULT NULL,
	min_age integer DEFAULT NULL,
	max_age integer DEFAULT NULL,
	is_ai_filter boolean DEFAULT false
) RETURNS TABLE (
  profile_id UUID,
  user_id UUID,
  displayname TEXT,
  tagline TEXT,
  bio TEXT,
  age INTEGER,
  country_id INTEGER,
  country_name TEXT,
  state_name TEXT,
  gender_id INTEGER,
  provider TEXT,
  avatar_url TEXT,
  emoji TEXT,
  upvotes_count INTEGER,
  downvotes_count INTEGER,
  is_favorite BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
	p.id AS profile_id,
	p.user_id,
	p.displayname,
	p.tagline,
	p.bio,
	p.age,
	p.country_id,
	c.name AS country_name,
	s.name AS state_name,
	p.gender_id,
	p.provider,
	p.avatar_url,
	c.emoji,
	p.upvotes_count,
	p.downvotes_count,
	CASE 
	  WHEN f.favorite_user_id IS NOT NULL THEN true 
	  ELSE false 
	END AS is_favorite,
	p.is_ai  -- Selecting is_ai from profiles
  FROM profiles p
  JOIN countries c ON p.country_id = c.id
  JOIN states s ON p.state_id = s.id
  LEFT JOIN favorites f ON p.user_id = f.favorite_user_id AND f.user_id = logged_in_user_id
  WHERE p.user_id != logged_in_user_id 
	AND p.provider != 'anonymous'
	AND (gender_filter IS NULL OR p.gender_id = gender_filter)
	AND (min_age IS NULL OR p.age >= min_age)
	AND (max_age IS NULL OR p.age <= max_age)
	AND p.is_ai = is_ai_filter;  -- Apply is_ai_filter
END;
$$ LANGUAGE plpgsql;

--PLPGSQL function to fetch offline users
CREATE OR REPLACE FUNCTION fetch_offline_profiles(
	logged_in_user_id UUID,
	gender_filter INTEGER DEFAULT NULL,
	min_age integer DEFAULT NULL,
	max_age integer DEFAULT NULL,
	is_ai_filter boolean DEFAULT false
) RETURNS TABLE (
  profile_id UUID,
  user_id UUID,
  displayname TEXT,
  tagline TEXT,
  bio TEXT,
  age INTEGER,
  country_id INTEGER,
  country_name TEXT,
  state_name TEXT,
  gender_id INTEGER,
  provider TEXT,
  avatar_url TEXT,
  emoji TEXT,
  upvotes_count INTEGER,
  downvotes_count INTEGER,
  is_favorite BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
	p.id AS profile_id,
	p.user_id,
	p.displayname,
	p.tagline,
	p.bio,
	p.age,
	p.country_id,
	c.name AS country_name,
	s.name AS state_name,
	p.gender_id,
	p.provider,
	p.avatar_url,
	c.emoji,
	p.upvotes_count,
	p.downvotes_count,
	CASE 
	  WHEN f.favorite_user_id IS NOT NULL THEN true 
	  ELSE false 
	END AS is_favorite
  FROM profiles p
  JOIN presence pr ON p.user_id = pr.user_id
  JOIN countries c ON p.country_id = c.id
  JOIN states s ON p.state_id = s.id
  LEFT JOIN blocked_users b ON p.user_id = b.blocked_user_id AND b.user_id = logged_in_user_id
  LEFT JOIN favorites f ON p.user_id = f.favorite_user_id AND f.user_id = logged_in_user_id
  WHERE pr.status = 'offline' 
	AND p.user_id != logged_in_user_id 
	AND b.blocked_user_id IS NULL
	AND p.provider != 'anonymous'
	AND (gender_filter IS NULL OR p.gender_id = gender_filter)
	AND (min_age IS NULL OR p.age >= min_age)
	AND (max_age IS NULL OR p.age <= max_age)
	AND p.is_ai = is_ai_filter;  -- Apply is_ai_filter
END;
$$ LANGUAGE plpgsql;


--PLPGSQL function to fetch online users
CREATE OR REPLACE FUNCTION fetch_online_profiles(
  logged_in_user_id UUID,
  gender_filter INTEGER DEFAULT NULL,
  min_age INTEGER DEFAULT NULL,
  max_age INTEGER DEFAULT NULL,
  is_ai_filter BOOLEAN DEFAULT false
) RETURNS TABLE (
  profile_id UUID,
  user_id UUID,
  displayname TEXT,
  tagline TEXT,
  bio TEXT,
  age INTEGER,
  country_id INTEGER,
  country_name TEXT,
  state_name TEXT,
  gender_id INTEGER,
  provider TEXT,
  avatar_url TEXT,
  emoji TEXT,
  upvotes_count INTEGER,
  downvotes_count INTEGER,
  is_favorite BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
	p.id AS profile_id,
	p.user_id,
	p.displayname,
	p.tagline,
	p.bio,
	p.age,
	p.country_id,
	c.name AS country_name,
	s.name AS state_name,
	p.gender_id,
	p.provider,
	p.avatar_url,
	c.emoji,
	p.upvotes_count,
	p.downvotes_count,
	CASE 
	  WHEN f.favorite_user_id IS NOT NULL THEN true 
	  ELSE false 
	END AS is_favorite
  FROM profiles p
  JOIN presence pr ON p.user_id = pr.user_id
  JOIN countries c ON p.country_id = c.id
  JOIN states s ON p.state_id = s.id
  LEFT JOIN blocked_users b ON p.user_id = b.blocked_user_id AND b.user_id = logged_in_user_id
  LEFT JOIN favorites f ON p.user_id = f.favorite_user_id AND f.user_id = logged_in_user_id
  WHERE pr.status = 'online' 
	AND p.user_id != logged_in_user_id 
	AND b.blocked_user_id IS NULL
	AND (gender_filter IS NULL OR p.gender_id = gender_filter)
	AND (min_age IS NULL OR p.age >= min_age)
	AND (max_age IS NULL OR p.age <= max_age)
	AND p.is_ai = is_ai_filter;  -- Apply is_ai_filter
END;
$$ LANGUAGE plpgsql;

--PLPGSQL function to fetch blocked profiles
CREATE OR REPLACE FUNCTION get_blocked_profiles(
  blocker_id UUID
) RETURNS TABLE (
  profile_id UUID,
  displayname TEXT,
  avatar_url TEXT,
  gender_id INTEGER,
  user_id UUID,
  upvotes_count INTEGER,
  country TEXT,
  country_emoji TEXT,
  age INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
	p.id AS profile_id, 
	p.displayname, 
	p.avatar_url, 
	p.gender_id, 
	p.user_id, 
	p.upvotes_count,
	c.name AS country,
	c.emoji AS country_emoji,
	p.age
  FROM blocked_users b
  JOIN profiles p ON b.blocked_user_id = p.user_id
  LEFT JOIN countries c ON p.country_id = c.id
  WHERE b.user_id = blocker_id;
END;
$$ LANGUAGE plpgsql;

--PLPGSQL function to fetch favorited profiles
CREATE OR REPLACE FUNCTION get_favorite_profiles(
  current_user_id UUID
) RETURNS TABLE (
  profile_id UUID,
  displayname TEXT,
  tagline TEXT,
  avatar_url TEXT,
  gender_id INTEGER,
  user_id UUID,
  upvotes_count INTEGER,
  country TEXT,
  country_emoji TEXT,
  age INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
	p.id AS profile_id, 
	p.displayname, 
	p.tagline, 
	p.avatar_url, 
	p.gender_id, 
	p.user_id, 
	p.upvotes_count::integer,  -- Cast the bigint to integer
	c.name AS country,
	c.emoji AS country_emoji,
	p.age
  FROM favorites f
  JOIN profiles p ON f.favorite_user_id = p.user_id
  LEFT JOIN countries c ON p.country_id = c.id
  WHERE f.user_id = current_user_id
	AND p.provider != 'anonymous';
END;
$$ LANGUAGE plpgsql;

--PLPGSQL function to fetch the most popular ai profiles
CREATE OR REPLACE FUNCTION get_most_popular_ai_profiles(
  profile_limit INTEGER
) RETURNS TABLE (
  profile_id UUID,
  user_id UUID,
  displayname TEXT,
  tagline TEXT,
  age INTEGER,
  avatar_url TEXT,
  provider TEXT,
  gender TEXT,
  country TEXT,
  created TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
	p.id AS profile_id,
	p.user_id,
	p.displayname,
	p.tagline,
	p.age,
	p.avatar_url,
	p.provider,
	g.name AS gender,
	c.name AS country,
	p.created
  FROM 
	profiles p
  LEFT JOIN 
	genders g ON p.gender_id = g.id
  LEFT JOIN 
	countries c ON p.country_id = c.id
  WHERE 
	p.avatar_url IS NOT NULL 
	AND p.avatar_url != '' 
	AND p.is_ai = TRUE  -- Only AI profiles
  LIMIT profile_limit;  -- Use the parameter for the limit value
END;
$$ LANGUAGE plpgsql;

--PLPGSQL function to fetch the most popular profiles
CREATE OR REPLACE FUNCTION get_most_popular_profiles(
  profile_limit INTEGER
) RETURNS TABLE (
  profile_id UUID,
  user_id UUID,
  displayname TEXT,
  tagline TEXT,
  age INTEGER,
  avatar_url TEXT,
  provider TEXT,
  gender TEXT,
  country TEXT,
  upvote_count INTEGER,
  created TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
	p.id AS profile_id,
	p.user_id,
	p.displayname,
	p.tagline,
	p.age,
	p.avatar_url,
	p.provider,
	g.name AS gender,
	c.name AS country,
	COUNT(v.vote_type)::int AS upvote_count,
	p.created
  FROM 
	profiles p
  JOIN 
	votes v ON p.id = v.profile_id
  LEFT JOIN 
	genders g ON p.gender_id = g.id
  LEFT JOIN 
	countries c ON p.country_id = c.id
  WHERE 
	v.vote_type = 'upvote' 
	AND p.avatar_url IS NOT NULL 
	AND p.avatar_url != '' 
	AND p.provider != 'anonymous'
  GROUP BY 
	p.id, g.name, c.name
  ORDER BY 
	upvote_count DESC
  LIMIT profile_limit;  -- Use the parameter for the limit value
END;
$$ LANGUAGE plpgsql;

--PLPGSQL function to fetch the most recent female profiles
CREATE OR REPLACE FUNCTION get_recent_females(
  profile_limit INTEGER
) RETURNS TABLE (
  profile_id UUID,
  user_id UUID,
  displayname TEXT,
  tagline TEXT,
  age INTEGER,
  avatar_url TEXT,
  provider TEXT,
  gender TEXT,
  country TEXT,
  upvote_count INTEGER,
  created TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
	p.id AS profile_id,
	p.user_id,
	p.displayname,
	p.tagline,
	p.age,
	p.avatar_url,
	p.provider,
	g.name AS gender,
	c.name AS country,
	COUNT(v.vote_type)::int AS upvote_count,
	p.created
  FROM 
	profiles p
  LEFT JOIN 
	votes v ON p.id = v.profile_id AND v.vote_type = 'upvote'
  LEFT JOIN 
	genders g ON p.gender_id = g.id
  LEFT JOIN 
	countries c ON p.country_id = c.id
  WHERE 
	p.avatar_url IS NOT NULL 
	AND p.avatar_url != '' 
	AND p.provider != 'anonymous'
	AND p.gender_id = 2                        -- Filter by gender_id = 2 (females)
  GROUP BY 
	p.id, g.name, c.name
  ORDER BY 
	p.created DESC
  LIMIT profile_limit;  -- Use the parameter for the limit value
END;
$$ LANGUAGE plpgsql;

--PLPGSQL function to fetch the most recent male profiles
CREATE OR REPLACE FUNCTION get_recent_males(
  profile_limit INTEGER
) RETURNS TABLE (
  profile_id UUID,
  user_id UUID,
  displayname TEXT,
  tagline TEXT,
  age INTEGER,
  avatar_url TEXT,
  provider TEXT,
  gender TEXT,
  country TEXT,
  upvote_count INTEGER,
  created TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
	p.id AS profile_id,
	p.user_id,
	p.displayname,
	p.tagline,
	p.age,
	p.avatar_url,
	p.provider,
	g.name AS gender,
	c.name AS country,
	COUNT(v.vote_type)::int AS upvote_count,
	p.created
  FROM 
	profiles p
  LEFT JOIN 
	votes v ON p.id = v.profile_id AND v.vote_type = 'upvote'
  LEFT JOIN 
	genders g ON p.gender_id = g.id
  LEFT JOIN 
	countries c ON p.country_id = c.id
  WHERE 
	p.avatar_url IS NOT NULL 
	AND p.avatar_url != '' 
	AND p.provider != 'anonymous'
	AND p.gender_id = 1                        -- Filter by gender_id = 1 (males)
  GROUP BY 
	p.id, g.name, c.name
  ORDER BY 
	p.created DESC
  LIMIT profile_limit;  -- Use the parameter for the limit value
END;
$$ LANGUAGE plpgsql;

--PLPGSQL function to fetch the most recent profiles
CREATE OR REPLACE FUNCTION get_recent_profiles(
  profile_limit INTEGER
) RETURNS TABLE (
  profile_id UUID,
  user_id UUID,
  displayname TEXT,
  tagline TEXT,
  age INTEGER,
  avatar_url TEXT,
  provider TEXT,
  gender TEXT,
  country TEXT,
  upvote_count INTEGER,
  created TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
	p.id AS profile_id,
	p.user_id,
	p.displayname,
	p.tagline,
	p.age,
	p.avatar_url,
	p.provider,
	g.name AS gender,
	c.name AS country,
	COUNT(v.vote_type)::int AS upvote_count,
	p.created
  FROM 
	profiles p
  LEFT JOIN 
	votes v ON p.id = v.profile_id AND v.vote_type = 'upvote'
  LEFT JOIN 
	genders g ON p.gender_id = g.id
  LEFT JOIN 
	countries c ON p.country_id = c.id
  WHERE 
	p.avatar_url IS NOT NULL 
	AND p.avatar_url != '' 
	AND p.provider != 'anonymous'
  GROUP BY 
	p.id, g.name, c.name
  ORDER BY 
	p.created DESC
  LIMIT profile_limit;  -- Use the parameter for the limit value
END;
$$ LANGUAGE plpgsql;

--PLPGSQL function to fetch the most upvoted profiles
CREATE OR REPLACE FUNCTION get_upvoted_profiles(
  upvoter_id UUID
) RETURNS TABLE (
  profile_id UUID, 
  displayname TEXT, 
  avatar_url TEXT, 
  gender_id INTEGER, 
  user_id UUID, 
  upvotes_count INTEGER,
  country TEXT,
  country_emoji TEXT,
  age INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
	p.id AS profile_id, 
	p.displayname, 
	p.avatar_url, 
	p.gender_id, 
	p.user_id, 
	p.upvotes_count,
	c.name AS country,
	c.emoji AS country_emoji,
	p.age
  FROM votes v
  JOIN profiles p ON v.profile_id = p.id
  LEFT JOIN countries c ON p.country_id = c.id
  WHERE v.user_id = upvoter_id 
	AND v.vote_type = 'upvote'
	AND p.provider != 'anonymous';
END;
$$ LANGUAGE plpgsql;

--PLPGSQL function to fetch user profile
CREATE OR REPLACE FUNCTION get_user_profile(
  p_user_id UUID
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  gender TEXT,
  gender_id INTEGER,
  country TEXT,
  country_emoji TEXT,
  state TEXT,
  city TEXT,
  displayname TEXT,
  tagline TEXT,
  bio TEXT,
  age INTEGER,
  provider TEXT,
  avatar_url TEXT,
  looking_for TEXT[],
  status TEXT,
  status_id INTEGER,
  is_ai BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
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
	array_agg(lf.name::text) AS looking_for,
	status.name::text,
	p.status_id,
	p.is_ai -- Selecting is_ai from profiles
  FROM profiles p
  LEFT JOIN sex s ON p.gender_id = s.id
  LEFT JOIN countries c ON p.country_id = c.id
  LEFT JOIN states st ON p.state_id = st.id
  LEFT JOIN cities ct ON p.city_id = ct.id
  LEFT JOIN user_looking_for ulf ON p.user_id = ulf.user_id
  LEFT JOIN looking_for lf ON ulf.looking_for_id = lf.id
  LEFT JOIN status ON p.status_id = status.id
  WHERE p.user_id = p_user_id
  GROUP BY p.id, p.user_id, s.gender, p.gender_id, c.name, c.emoji, st.name, ct.name, p.displayname, p.tagline, p.bio, p.age, p.provider, p.avatar_url, p.site_url, status.name, p.status_id, p.is_ai;
END;
$$ LANGUAGE plpgsql;

--PLPGSQL function to get user profile with the sex
CREATE OR REPLACE FUNCTION get_user_profile_with_sex(
  p_user_id UUID
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  gender TEXT,
  country_id INTEGER,
  state_id INTEGER,
  city_id INTEGER,
  displayname TEXT,
  tagline TEXT,
  bio TEXT,
  age INTEGER,
  provider TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
	p.id,
	p.user_id,
	s.gender::text,
	p.country_id,
	p.state_id,
	p.city_id,
	p.displayname::text,
	p.tagline::text,
	p.bio::text,
	p.age,
	p.provider::text,
	p.avatar_url::text
  FROM profiles p
  LEFT JOIN sex s ON p.gender_id = s.id
  WHERE p.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

--PLPGSQL function to fetch filtered profiles by IDs
CREATE OR REPLACE FUNCTION fetch_filtered_profiles_by_ids(
  user_ids uuid[],
  logged_in_user_id uuid,
  gender_filter integer DEFAULT NULL,
  min_age integer DEFAULT NULL,
  max_age integer DEFAULT NULL,
  is_ai_filter BOOLEAN DEFAULT false
)
RETURNS TABLE (
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
  is_favorite boolean
)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS profile_id,
    p.user_id,
    p.displayname,
    p.tagline,
    p.bio,
    p.age,
    p.country_id,
    c.name AS country_name,
    s.name AS state_name,
    p.gender_id,
    p.provider,
    p.avatar_url,
    c.emoji,
    p.upvotes_count,
    p.downvotes_count,
    CASE 
      WHEN f.favorite_user_id IS NOT NULL THEN true 
      ELSE false 
    END AS is_favorite
  FROM profiles p
  JOIN countries c ON p.country_id = c.id
  JOIN states s ON p.state_id = s.id
  LEFT JOIN blocked_users b ON p.user_id = b.blocked_user_id AND b.user_id = logged_in_user_id
  LEFT JOIN favorites f ON p.user_id = f.favorite_user_id AND f.user_id = logged_in_user_id
  WHERE p.user_id = ANY(user_ids)
    AND p.user_id != logged_in_user_id
    AND b.blocked_user_id IS NULL
    AND (gender_filter IS NULL OR p.gender_id = gender_filter)
    AND (min_age IS NULL OR p.age >= min_age)
    AND (max_age IS NULL OR p.age <= max_age)
    AND p.is_ai = is_ai_filter;  -- Apply is_ai_filter
END;
$$ LANGUAGE plpgsql;
