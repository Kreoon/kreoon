-- Ejecutar en Supabase SQL Editor (Kreoon) - Módulo Red social
-- Corrige 404 hashtags + 403 en tablas social

-- 1. Crear hashtags y post_hashtags (404)
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

DROP POLICY IF EXISTS "Anyone can read hashtags" ON public.hashtags;
CREATE POLICY "Anyone can read hashtags" ON public.hashtags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read post_hashtags" ON public.post_hashtags;
CREATE POLICY "Anyone can read post_hashtags" ON public.post_hashtags FOR SELECT USING (true);

GRANT SELECT ON public.hashtags TO authenticated, anon;
GRANT SELECT ON public.post_hashtags TO authenticated, anon;

-- 2. Grants para tablas social
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_stories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_views TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.followers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_notifications TO authenticated;
