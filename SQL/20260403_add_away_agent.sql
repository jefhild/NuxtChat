-- Away Agent feature: agent_configs, agent_conversation_log, profiles.agent_enabled
-- Apply after 20260402_add_notification_interaction_log.sql

-- 1. Fast lookup flag on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agent_enabled BOOLEAN DEFAULT false;

-- 2. Label messages sent by an away agent (for UI disclosure)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sent_by_agent BOOLEAN DEFAULT false;

-- 2. Per-user agent configuration
CREATE TABLE IF NOT EXISTS public.agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  -- Persona prompt: user picks a preset or writes their own
  prompt_preset_key TEXT DEFAULT 'friendly',   -- 'friendly'|'curious'|'playful'|'professional'|'custom'
  system_prompt_addition TEXT,                 -- user-written custom text (used when preset_key = 'custom' or to supplement)
  greeting_template TEXT,                      -- opening message the agent sends proactively
  -- Limits
  max_exchanges_per_conversation INT DEFAULT 5 CHECK (max_exchanges_per_conversation BETWEEN 1 AND 20),
  max_conversations_per_session INT DEFAULT 10 CHECK (max_conversations_per_session BETWEEN 1 AND 50),
  -- Optional targeting criteria (null = no filter)
  target_gender_ids INT[],                     -- only reach out to these gender IDs
  target_mood_keys TEXT[],                     -- only reach out to users with these intent/mood keys
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Conversation tracking (exchange count, status, deduplication)
CREATE TABLE IF NOT EXISTS public.agent_conversation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  room_id TEXT,                                -- chat room/channel identifier
  exchange_count INT DEFAULT 0,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'limit_reached', 'handed_off', 'owner_returned', 'target_blocked')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  -- One active conversation per agent↔target pair at a time
  CONSTRAINT uq_agent_target_active UNIQUE (agent_profile_id, target_user_id, status)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_agent_configs_profile_id ON public.agent_configs (profile_id);
CREATE INDEX IF NOT EXISTS idx_agent_configs_enabled ON public.agent_configs (enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_agent_conv_agent_profile ON public.agent_conversation_log (agent_profile_id);
CREATE INDEX IF NOT EXISTS idx_agent_conv_status ON public.agent_conversation_log (status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_profiles_agent_enabled ON public.profiles (agent_enabled) WHERE agent_enabled = true;

-- 5. RLS
ALTER TABLE public.agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_conversation_log ENABLE ROW LEVEL SECURITY;

-- agent_configs: owner can read/write their own config; service role has full access
CREATE POLICY "agent_configs_owner_select" ON public.agent_configs
  FOR SELECT USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "agent_configs_owner_insert" ON public.agent_configs
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "agent_configs_owner_update" ON public.agent_configs
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "agent_configs_owner_delete" ON public.agent_configs
  FOR DELETE USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- agent_conversation_log: owner can view their own conversations
CREATE POLICY "agent_conv_log_owner_select" ON public.agent_conversation_log
  FOR SELECT USING (
    agent_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- 6. Updated_at trigger for agent_configs
CREATE OR REPLACE FUNCTION public.set_agent_config_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_config_updated_at ON public.agent_configs;
CREATE TRIGGER trg_agent_config_updated_at
  BEFORE UPDATE ON public.agent_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_agent_config_updated_at();
