-- Store named individuals referenced by Newsmesh metadata
CREATE TABLE IF NOT EXISTS public.people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.people IS
  'Normalized list of notable people appearing in articles.';

COMMENT ON COLUMN public.people.slug IS
  'Lowercase slug generated from the person name for routing.';

CREATE TABLE IF NOT EXISTS public.article_people (
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, person_id)
);

COMMENT ON TABLE public.article_people IS
  'Join table linking articles to the people mentioned within them.';

CREATE INDEX IF NOT EXISTS article_people_person_id_idx
  ON public.article_people (person_id);

CREATE INDEX IF NOT EXISTS article_people_article_id_idx
  ON public.article_people (article_id);
