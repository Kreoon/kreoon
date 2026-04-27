-- Migration: Trust score auto-recalculation triggers
-- Date: 2026-04-27
-- Author: Alexander Cast
--
-- Triggers:
--   1. marketplace_reviews  INSERT/UPDATE → recalcular score del creador reseñado
--   2. marketplace_projects UPDATE status → recalcular score del creador asignado
-- ============================================================

-- ============================================================
-- Función trigger: reviews
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_recalculate_trust_on_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- reviewed_id es el user_id del creador que recibe la review
  IF NEW.reviewed_id IS NOT NULL THEN
    PERFORM calculate_creator_trust_score(NEW.reviewed_id);
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_recalculate_trust_on_review()
  IS 'Dispara recálculo del trust_score cuando se inserta o actualiza una review de marketplace.';

-- ============================================================
-- Función trigger: projects
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_recalculate_trust_on_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo recalcular cuando cambia el status del proyecto
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status)
     OR TG_OP = 'INSERT'
  THEN
    IF NEW.creator_id IS NOT NULL THEN
      PERFORM calculate_creator_trust_score(NEW.creator_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_recalculate_trust_on_project()
  IS 'Dispara recálculo del trust_score cuando el status de un proyecto de marketplace cambia.';

-- ============================================================
-- Trigger en marketplace_reviews
-- ============================================================
DROP TRIGGER IF EXISTS recalculate_trust_on_review
  ON marketplace_reviews;

CREATE TRIGGER recalculate_trust_on_review
  AFTER INSERT OR UPDATE
  ON marketplace_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_trust_on_review();

-- ============================================================
-- Trigger en marketplace_projects
-- ============================================================
DROP TRIGGER IF EXISTS recalculate_trust_on_project
  ON marketplace_projects;

CREATE TRIGGER recalculate_trust_on_project
  AFTER INSERT OR UPDATE OF status
  ON marketplace_projects
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_trust_on_project();
