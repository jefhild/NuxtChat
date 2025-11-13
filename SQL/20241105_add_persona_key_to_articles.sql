-- Adds persona tracking to saved Newsmesh drafts
ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS persona_key TEXT,
ADD COLUMN IF NOT EXISTS persona_id UUID,
ADD CONSTRAINT IF NOT EXISTS articles_persona_id_fkey
  FOREIGN KEY (persona_id) REFERENCES public.ai_personas (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.articles.persona_key IS
  'Newsmesh persona key used when drafting this article.';

COMMENT ON COLUMN public.articles.persona_id IS
  'Foreign key to ai_personas.id to preserve the exact persona configuration.';

CREATE INDEX IF NOT EXISTS articles_persona_id_idx
  ON public.articles (persona_id);

CREATE INDEX IF NOT EXISTS articles_persona_key_idx
  ON public.articles (persona_key);
