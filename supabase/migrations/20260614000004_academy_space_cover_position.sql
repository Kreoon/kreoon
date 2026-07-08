-- Posición vertical del cover del space (banner hero).
-- 0 = enfoca la parte superior de la imagen, 50 = centro, 100 = parte inferior.
-- Permite reposicionar el banner para que no se "moche" la parte importante.

ALTER TABLE public.academy_spaces
  ADD COLUMN IF NOT EXISTS cover_position smallint NOT NULL DEFAULT 50;

COMMENT ON COLUMN public.academy_spaces.cover_position IS
  'Posición vertical (object-position Y) del cover en el hero, 0-100. 50 = centro.';
