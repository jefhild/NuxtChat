-- Track email auth / email-link send attempts so public auth flows can be
-- rate-limited by IP, email hash, and user id.

CREATE TABLE IF NOT EXISTS public.auth_send_attempts (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action_type TEXT NOT NULL CHECK (action_type IN ('email_auth_start', 'link_email_start')),
  email_normalized TEXT,
  email_hash TEXT,
  ip_address INET,
  user_agent TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT,
  captcha_passed BOOLEAN NOT NULL DEFAULT false,
  decision TEXT NOT NULL CHECK (decision IN ('allowed', 'blocked')),
  block_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_send_attempts_action_created
  ON public.auth_send_attempts (action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_send_attempts_ip_created
  ON public.auth_send_attempts (ip_address, created_at DESC)
  WHERE ip_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_send_attempts_email_hash_created
  ON public.auth_send_attempts (email_hash, created_at DESC)
  WHERE email_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_send_attempts_user_created
  ON public.auth_send_attempts (auth_user_id, created_at DESC)
  WHERE auth_user_id IS NOT NULL;
