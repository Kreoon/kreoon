-- Permitir media (imágenes, GIFs, stickers, video corto, audio) en
-- comentarios del feed.
ALTER TABLE public.academy_post_comments
  ADD COLUMN IF NOT EXISTS media_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
