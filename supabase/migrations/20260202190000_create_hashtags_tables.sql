-- Tablas hashtags y post_hashtags (referenciadas por extract_hashtags() pero nunca creadas)

CREATE TABLE IF NOT EXISTS public.hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT NOT NULL UNIQUE,
  use_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_hashtags (
  post_id UUID NOT NULL REFERENCES public.portfolio_posts(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer (Explore es público)
CREATE POLICY "Anyone can read hashtags"
ON public.hashtags FOR SELECT
USING (true);

CREATE POLICY "Anyone can read post_hashtags"
ON public.post_hashtags FOR SELECT
USING (true);

GRANT SELECT ON public.hashtags TO authenticated, anon;
GRANT SELECT ON public.post_hashtags TO authenticated, anon;
