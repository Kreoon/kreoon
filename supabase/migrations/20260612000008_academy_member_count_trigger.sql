-- ============================================================
-- Trigger automático para mantener academy_spaces.member_count
-- siempre sincronizado con el número real de miembros activos
-- (excluyendo al owner).
--
-- Antes el contador dependía del webhook de Stripe, que falla en
-- estos casos:
--   - INSERTs manuales (creación admin / fix de DB).
--   - Eventos webhook sin la metadata esperada (cupones 100%).
--   - Bans / reactivaciones desde el panel admin.
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_academy_membership_recount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_space_id := OLD.space_id;
  ELSE
    v_space_id := NEW.space_id;
  END IF;

  UPDATE academy_spaces s
  SET member_count = (
    SELECT COUNT(*)
    FROM academy_memberships m
    WHERE m.space_id = v_space_id
      AND m.is_active = true
      AND m.role != 'owner'
  )
  WHERE s.id = v_space_id;

  IF TG_OP = 'UPDATE' AND OLD.space_id IS DISTINCT FROM NEW.space_id THEN
    UPDATE academy_spaces s
    SET member_count = (
      SELECT COUNT(*)
      FROM academy_memberships m
      WHERE m.space_id = OLD.space_id
        AND m.is_active = true
        AND m.role != 'owner'
    )
    WHERE s.id = OLD.space_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_membership_recount_t ON public.academy_memberships;
CREATE TRIGGER trg_academy_membership_recount_t
  AFTER INSERT OR UPDATE OR DELETE ON public.academy_memberships
  FOR EACH ROW EXECUTE FUNCTION public.trg_academy_membership_recount();

-- Recalcular todos los spaces existentes (idempotente).
UPDATE academy_spaces s
SET member_count = (
  SELECT COUNT(*)
  FROM academy_memberships m
  WHERE m.space_id = s.id
    AND m.is_active = true
    AND m.role != 'owner'
);
