ALTER TABLE public.agent_configs
  ADD COLUMN IF NOT EXISTS first_auto_reply_template TEXT;
