-- Migration: Auto-archivo de contenido pagado al 100%
-- Date: 2026-05-17
--
-- Trigger BEFORE UPDATE en `content` que mueve automáticamente un item
-- al status 'archived' cuando ambos lados de pago están resueltos.
--
-- Cubre los dos flujos de pago existentes:
--   A) Pago directo por talento: admin marca creator_paid/editor_paid = true
--      directamente en el contenido (ContentDetailDialog o DraggableContentCard).
--   B) Nómina mensual (fn_monthly_talent_payroll): la función marca
--      creator_paid/editor_paid = true al incluir el contenido en un lote.
--
-- Reglas de archivado:
--   - Lado creador "resuelto" si: no hay creator_id, o creator_payment = 0, o creator_paid = true
--   - Lado editor "resuelto" si:  no hay editor_id,  o editor_payment  = 0, o editor_paid  = true
--   - Al menos un lado debe tener pago asignado (evita archivar contenido sin pagos)
--   - El status actual debe ser aprobado/pagado/entregado/corregido
--   - El contenido no debe estar ya archivado

CREATE OR REPLACE FUNCTION public.fn_auto_archive_fully_paid_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_done boolean;
  v_editor_done  boolean;
  v_has_payment  boolean;
BEGIN
  -- Salida temprana: ya está archivado
  IF NEW.status = 'archived' THEN
    RETURN NEW;
  END IF;

  -- Solo aplica a estados finales donde el trabajo está listo
  IF NEW.status NOT IN ('approved', 'paid', 'delivered', 'corrected') THEN
    RETURN NEW;
  END IF;

  -- Lado creador: resuelto si no hay creador, sin pago asignado, o ya pagado
  v_creator_done := (
    NEW.creator_id IS NULL
    OR COALESCE(NEW.creator_payment, 0) = 0
    OR NEW.creator_paid = TRUE
  );

  -- Lado editor: resuelto si no hay editor, sin pago asignado, o ya pagado
  v_editor_done := (
    NEW.editor_id IS NULL
    OR COALESCE(NEW.editor_payment, 0) = 0
    OR NEW.editor_paid = TRUE
  );

  -- Requiere al menos un pago real para auto-archivar
  -- (evita archivar contenido ambassador/gratuito sin querer)
  v_has_payment := (
    COALESCE(NEW.creator_payment, 0) > 0
    OR COALESCE(NEW.editor_payment, 0) > 0
  );

  IF v_creator_done AND v_editor_done AND v_has_payment THEN
    NEW.status := 'archived';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_archive_fully_paid_content ON public.content;
CREATE TRIGGER trigger_auto_archive_fully_paid_content
  BEFORE UPDATE OF creator_paid, editor_paid ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_archive_fully_paid_content();

COMMENT ON FUNCTION public.fn_auto_archive_fully_paid_content() IS
  'Mueve contenido a status=archived cuando creator_paid y editor_paid están ambos '
  'resueltos y hay al menos un pago asignado. Cubre pago directo y nómina mensual. '
  'El log de historial sigue funcionando via el trigger on_content_status_change existente.';
