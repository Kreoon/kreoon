-- Borrar versión legacy de 4 args de award_space_points.
-- La nueva versión de 5 args tiene p_reference_id UUID DEFAULT NULL,
-- por lo que llamadas con 4 argumentos resuelven automáticamente a ella.
-- Antes, las dos firmas convivían y PostgreSQL no podía elegir cuando el
-- 3er parámetro llegaba como `unknown` (sin cast desde PostgREST), causando
-- error 42725 "function ... is not unique" en POST a /rest/v1/academy_posts.

DROP FUNCTION IF EXISTS public.award_space_points(uuid, uuid, text, integer);
