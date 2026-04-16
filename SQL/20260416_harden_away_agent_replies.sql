-- Away agent reply locking and language-practice context
-- Prevent overlapping reactive task runs from generating duplicate replies.

ALTER TABLE public.agent_conversation_log
  ADD COLUMN IF NOT EXISTS reply_lock_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_replied_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agent_conv_reply_lock
  ON public.agent_conversation_log (reply_lock_until)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_agent_conv_last_replied_message
  ON public.agent_conversation_log (last_replied_message_id)
  WHERE last_replied_message_id IS NOT NULL;
