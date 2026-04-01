-- Enable Realtime for favorites and votes tables
-- Run this in the Supabase SQL editor (requires superuser / dashboard access)

-- 1. Add tables to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.favorites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;

-- 2. Set REPLICA IDENTITY FULL so the full row is included in change events
--    (required for INSERT filter payloads to include all columns)
ALTER TABLE public.favorites REPLICA IDENTITY FULL;
ALTER TABLE public.votes REPLICA IDENTITY FULL;

-- 3. RLS SELECT policies so authenticated users (including anonymous)
--    can receive Realtime events for their own rows

-- Favorites: let users see favorites where they are the target
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'favorites' AND policyname = 'Users can view their own incoming favorites'
  ) THEN
    CREATE POLICY "Users can view their own incoming favorites"
    ON public.favorites FOR SELECT
    USING (favorite_user_id = auth.uid());
  END IF;
END $$;

-- Votes: let users see votes cast on their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'votes' AND policyname = 'Users can view votes on their own profile'
  ) THEN
    CREATE POLICY "Users can view votes on their own profile"
    ON public.votes FOR SELECT
    USING (
      profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    );
  END IF;
END $$;
