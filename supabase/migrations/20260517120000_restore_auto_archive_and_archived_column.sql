-- Migration: Restaurar trigger auto-archivo + columna Archivados
-- Date: 2026-05-17
--
-- 1. Restaura fn_auto_archive_fully_paid_content (trigger BEFORE UPDATE)
--    que mueve contenido a 'archived' cuando creator_paid y editor_paid
--    están ambos resueltos y hay al menos un pago asignado.
--
-- 2. Convierte la columna "Pagado" en "Archivados" en organization_statuses.
--
-- 3. Dispara el trigger para contenido 'approved' ya pagado al 100%.

-- ── Trigger ─────────────────────────────────────────────────────────────────

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
  IF NEW.status = 'archived' THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('approved', 'paid', 'delivered', 'corrected') THEN
    RETURN NEW;
  END IF;

  v_creator_done := (
    NEW.creator_id IS NULL
    OR COALESCE(NEW.creator_payment, 0) = 0
    OR NEW.creator_paid = TRUE
  );

  v_editor_done := (
    NEW.editor_id IS NULL
    OR COALESCE(NEW.editor_payment, 0) = 0
    OR NEW.editor_paid = TRUE
  );

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

-- ── Columna Archivados en organization_statuses ──────────────────────────────

-- Convierte la entrada "Pagado" a "Archivados" para la única org activa
UPDATE organization_statuses
SET status_key = 'archived',
    label      = 'Archivados',
    color      = '#64748b',
    icon       = 'archive'
WHERE status_key = 'paid'
  AND organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e';

-- ── Retroactivo: archivar contenido ya pagado al 100% ────────────────────────

-- Dispara el trigger para los ítems 'approved' con ambos pagos marcados
UPDATE public.content
SET creator_paid = creator_paid
WHERE organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  AND status = 'approved'
  AND creator_paid = true
  AND editor_paid  = true;
