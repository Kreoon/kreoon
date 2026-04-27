-- =============================================================================
-- FIX: rating_avg siempre en 0.0 para creator_profiles
--
-- PROBLEMA: El trigger existente (trigger_update_creator_rating) apunta a
-- creator_reviews (tabla antigua), pero las reviews del marketplace van a
-- marketplace_reviews. Por eso creator_profiles.rating_avg nunca se actualiza.
--
-- SOLUCION: Crear trigger correcto que actualice creator_profiles cuando
-- llega una review a marketplace_reviews.
-- =============================================================================

-- 1. Funcion para actualizar rating en creator_profiles desde marketplace_reviews
CREATE OR REPLACE FUNCTION public.update_creator_profile_rating_from_marketplace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_new_rating NUMERIC(3,2);
  v_new_count INTEGER;
BEGIN
  -- Determinar el user_id afectado (el creador que recibio la review)
  v_user_id := COALESCE(NEW.reviewed_id, OLD.reviewed_id);

  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calcular nuevo promedio y conteo
  SELECT
    COALESCE(ROUND(AVG(overall_rating)::numeric, 2), 0),
    COUNT(*)
  INTO v_new_rating, v_new_count
  FROM public.marketplace_reviews
  WHERE reviewed_id = v_user_id
    AND is_public = true
    AND overall_rating IS NOT NULL;

  -- Actualizar creator_profiles (si existe para este user_id)
  UPDATE public.creator_profiles
  SET
    rating_avg = v_new_rating,
    rating_count = v_new_count,
    updated_at = now()
  WHERE user_id = v_user_id;

  -- Tambien actualizar profiles.avg_rating para consistencia
  UPDATE public.profiles
  SET
    avg_rating = v_new_rating,
    updated_at = now()
  WHERE id = v_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Crear trigger en marketplace_reviews
DROP TRIGGER IF EXISTS trigger_update_creator_profile_rating_marketplace ON public.marketplace_reviews;

CREATE TRIGGER trigger_update_creator_profile_rating_marketplace
  AFTER INSERT OR UPDATE OR DELETE ON public.marketplace_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_creator_profile_rating_from_marketplace();

-- 3. BACKFILL: Recalcular rating para todos los creator_profiles existentes
-- Esto actualiza los ratings basandose en reviews existentes en marketplace_reviews
WITH rating_stats AS (
  SELECT
    mr.reviewed_id,
    ROUND(AVG(mr.overall_rating)::numeric, 2) as avg_rating,
    COUNT(*) as review_count
  FROM public.marketplace_reviews mr
  WHERE mr.is_public = true
    AND mr.overall_rating IS NOT NULL
  GROUP BY mr.reviewed_id
)
UPDATE public.creator_profiles cp
SET
  rating_avg = COALESCE(rs.avg_rating, 0),
  rating_count = COALESCE(rs.review_count, 0),
  updated_at = now()
FROM rating_stats rs
WHERE cp.user_id = rs.reviewed_id;

-- 4. Tambien backfill en profiles para consistencia
WITH rating_stats AS (
  SELECT
    mr.reviewed_id,
    ROUND(AVG(mr.overall_rating)::numeric, 2) as avg_rating
  FROM public.marketplace_reviews mr
  WHERE mr.is_public = true
    AND mr.overall_rating IS NOT NULL
  GROUP BY mr.reviewed_id
)
UPDATE public.profiles p
SET
  avg_rating = COALESCE(rs.avg_rating, 0),
  updated_at = now()
FROM rating_stats rs
WHERE p.id = rs.reviewed_id;

-- 5. Para perfiles SIN reviews, asegurar que rating_avg no sea NULL
UPDATE public.creator_profiles
SET rating_avg = 0, rating_count = 0
WHERE rating_avg IS NULL;

COMMENT ON FUNCTION public.update_creator_profile_rating_from_marketplace() IS
'Actualiza rating_avg y rating_count en creator_profiles cuando se crea/modifica una review en marketplace_reviews';
