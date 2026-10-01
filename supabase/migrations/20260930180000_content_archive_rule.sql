-- Regla única de archivado de producciones (reemplaza fn_auto_archive_fully_paid_content y
-- fn_auto_archive_canje_on_approve).
--
-- «Archivado» es un estado de cierre AUTOMÁTICO, nunca manual:
--   · Se archiva cuando el CLIENTE APROBÓ (status 'approved' o el legado 'paid') y todos los que
--     tienen pago asignado (creador / editor) están pagados. Canje o contenido de embajador
--     (sin pago) se archiva al aprobarse.
--   · Se evalúa al cambiar el estado O un pago, en cualquier orden (antes, pagar primero y aprobar
--     después dejaba el contenido en 'approved' para siempre).
--   · Ya no archiva desde 'delivered' / 'corrected' (aún sin aprobación del cliente).
--   · Poner 'archived' a mano se rechaza salvo que la regla ya se cumpla.
--   · Si se revierte un pago, el contenido vuelve a 'approved'.

CREATE OR REPLACE FUNCTION public.fn_content_archive_rule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_canje     boolean;
  v_has_payment  boolean;
  v_creator_done boolean;
  v_editor_done  boolean;
  v_closed       boolean;
  v_old_status   text := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;
BEGIN
  v_is_canje := COALESCE(NEW.is_ambassador_content, false) OR NEW.reward_type = 'UP';
  v_has_payment := COALESCE(NEW.creator_payment, 0) > 0 OR COALESCE(NEW.editor_payment, 0) > 0;
  v_creator_done := NEW.creator_id IS NULL OR COALESCE(NEW.creator_payment, 0) = 0 OR NEW.creator_paid = TRUE;
  v_editor_done  := NEW.editor_id  IS NULL OR COALESCE(NEW.editor_payment, 0)  = 0 OR NEW.editor_paid  = TRUE;
  -- Cerrado = canje, o hay algo que pagar y todo está pagado
  v_closed := v_is_canje OR (v_has_payment AND v_creator_done AND v_editor_done);

  IF NEW.status = 'archived' THEN
    IF v_old_status = 'archived' THEN
      -- Ya archivado: si se revirtió un pago, reabrir como aprobado
      IF NOT v_closed THEN
        NEW.status := 'approved';
      END IF;
    ELSIF v_old_status IN ('approved', 'paid') AND v_closed THEN
      NULL; -- equivale a lo que haría la regla
    ELSE
      RAISE EXCEPTION 'El estado «Archivado» es automático: se aplica cuando el cliente aprueba y se pagó a creador y editor'
        USING ERRCODE = 'check_violation';
    END IF;
  ELSIF NEW.status IN ('approved', 'paid') AND v_closed THEN
    NEW.status := 'archived';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_archive_fully_paid_content ON public.content;
DROP TRIGGER IF EXISTS trigger_auto_archive_canje_on_approve ON public.content;
DROP FUNCTION IF EXISTS public.fn_auto_archive_fully_paid_content();
DROP FUNCTION IF EXISTS public.fn_auto_archive_canje_on_approve();

DROP TRIGGER IF EXISTS trigger_content_archive_rule ON public.content;
CREATE TRIGGER trigger_content_archive_rule
  BEFORE INSERT OR UPDATE OF status, creator_paid, editor_paid, creator_payment, editor_payment,
    creator_id, editor_id, reward_type, is_ambassador_content
  ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_content_archive_rule();

-- Backfill: contenido aprobado y ya pagado que quedó atascado por el orden pago→aprobación
UPDATE public.content
SET status = status
WHERE status IN ('approved', 'paid');
