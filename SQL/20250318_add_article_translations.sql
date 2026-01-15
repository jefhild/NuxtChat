-- Store translated article rewrites per locale
CREATE TABLE IF NOT EXISTS public.article_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  headline TEXT,
  summary TEXT,
  body TEXT,
  references_jsonb JSONB,
  social JSONB,
  provider TEXT,
  model TEXT,
  source_language_code TEXT,
  translated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, locale)
);

CREATE INDEX IF NOT EXISTS article_translations_locale_idx
  ON public.article_translations (locale);
