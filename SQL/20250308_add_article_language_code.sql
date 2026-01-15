-- Track the original language for each article (IETF language tag, e.g., en-US)
ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS original_language_code TEXT;

COMMENT ON COLUMN public.articles.original_language_code IS
  'IETF language tag for the original article language (e.g., en-US).';
