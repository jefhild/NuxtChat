-- Migration: Add notification interaction log for weekly email digest
-- Date: 2026-04-02
--
-- Creates an immutable log of user interactions (favorites, profile upvotes, messages)
-- used to power the weekly activity summary email.
--
-- Key design decisions:
--   recipient_id ON DELETE CASCADE  — clean up if recipient deletes their account
--   actor_id     ON DELETE SET NULL — survive anon user purges; NULL = anonymous actor
--   Populated by DB triggers to ensure no write path is missed
--   votes trigger handles both INSERT (new upvote) and UPDATE (downvote→upvote)

-- ============================================================
-- 1. Interaction log table
-- ============================================================

CREATE TABLE public.notification_interaction_log (
  id             BIGSERIAL PRIMARY KEY,
  recipient_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  interaction    TEXT NOT NULL CHECK (interaction IN ('favorite', 'profile_upvote', 'message')),
  reference_id   UUID,           -- message.id for messages; NULL for favorites/upvotes
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  digest_sent_at TIMESTAMPTZ     -- NULL = not yet included in any digest send
);

CREATE INDEX idx_nil_recipient_digest
  ON public.notification_interaction_log (recipient_id, digest_sent_at);

CREATE INDEX idx_nil_created_at
  ON public.notification_interaction_log (created_at);

-- ============================================================
-- 2. Profile opt-out column
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_digest_enabled BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- 3. Trigger: favorites
--    favorites.user_id          → actor   (profiles.user_id = auth UUID)
--    favorites.favorite_user_id → recipient (profiles.user_id = auth UUID)
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_log_favorite_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_interaction_log (recipient_id, actor_id, interaction)
  VALUES (NEW.favorite_user_id, NEW.user_id, 'favorite');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_favorite
  AFTER INSERT ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_favorite_fn();

-- ============================================================
-- 4. Trigger: profile upvotes (votes table)
--    votes.user_id    → actor     (auth UUID directly)
--    votes.profile_id → profile PK — need JOIN to get recipient auth UUID
--    Handles INSERT (new upvote) and UPDATE (downvote→upvote conversion)
--    Skips if vote_type is not 'upvote'
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_log_profile_upvote_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id UUID;
BEGIN
  -- Only log upvotes
  IF NEW.vote_type <> 'upvote' THEN
    RETURN NEW;
  END IF;

  -- For updates: only log the conversion from downvote→upvote, not no-op updates
  IF TG_OP = 'UPDATE' AND OLD.vote_type = 'upvote' THEN
    RETURN NEW;
  END IF;

  -- Resolve recipient auth UUID from profile PK
  SELECT user_id INTO v_recipient_id
  FROM public.profiles
  WHERE id = NEW.profile_id;

  IF v_recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notification_interaction_log (recipient_id, actor_id, interaction)
  VALUES (v_recipient_id, NEW.user_id, 'profile_upvote');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_profile_upvote
  AFTER INSERT OR UPDATE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_profile_upvote_fn();

-- ============================================================
-- 5. Trigger: messages
--    messages.sender_id   → actor     (profiles.user_id = auth UUID)
--    messages.receiver_id → recipient (profiles.user_id = auth UUID)
--    Skips messages sent by AI personas
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_log_message_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip AI persona messages
  IF EXISTS (
    SELECT 1 FROM public.ai_personas WHERE profile_user_id = NEW.sender_id
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.receiver_id IS NULL OR NEW.sender_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notification_interaction_log
    (recipient_id, actor_id, interaction, reference_id)
  VALUES
    (NEW.receiver_id, NEW.sender_id, 'message', NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_message_fn();
