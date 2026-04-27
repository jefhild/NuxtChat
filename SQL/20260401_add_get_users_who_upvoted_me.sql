-- Create the missing get_users_who_upvoted_me function
-- Called by useUpvotes.js / getUserUpvotedMeProfiles()

CREATE OR REPLACE FUNCTION get_users_who_upvoted_me(
  input_user_id UUID
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
  -- Join the voter's profile (the person who cast the vote)
  JOIN profiles p ON v.user_id = p.user_id
  LEFT JOIN countries c ON p.country_id = c.id
  WHERE v.profile_id = (
    SELECT id FROM profiles WHERE user_id = input_user_id LIMIT 1
  )
    AND v.vote_type = 'upvote';
END;
$$ LANGUAGE plpgsql;
