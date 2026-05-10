-- Bring agent_conversation_log schema in line with current away-agent runtime.
-- Safe to run multiple times.

ALTER TABLE public.agent_conversation_log
  ADD COLUMN IF NOT EXISTS reply_lock_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_replied_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

ALTER TABLE public.agent_conversation_log
  DROP CONSTRAINT IF EXISTS agent_conversation_log_status_check;

ALTER TABLE public.agent_conversation_log
  ADD CONSTRAINT agent_conversation_log_status_check
  CHECK (
    status IN (
      'active',
      'pending_reply',
      'limit_reached',
      'handed_off',
      'owner_returned',
      'target_blocked',
      'expired_no_reply',
      'stale'
    )
  );

CREATE INDEX IF NOT EXISTS idx_agent_conv_reply_lock
  ON public.agent_conversation_log (reply_lock_until)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_agent_conv_last_replied_message
  ON public.agent_conversation_log (last_replied_message_id)
  WHERE last_replied_message_id IS NOT NULL;
