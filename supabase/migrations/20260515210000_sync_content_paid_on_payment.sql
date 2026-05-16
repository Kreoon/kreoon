-- Fix: sincronizar creator_paid/editor_paid en content cuando talent_payment pasa a 'paid'
-- Resuelve el bug donde pagos manuales no marcaban el contenido como pagado

CREATE OR REPLACE FUNCTION public.sync_content_paid_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo actuar cuando el status cambia A 'paid'
  IF NEW.status = 'paid'
     AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'paid')
     AND NEW.content_ids IS NOT NULL
     AND array_length(NEW.content_ids, 1) > 0
  THEN
    -- Marcar creator_paid donde el usuario es el creator
    UPDATE public.content
    SET creator_paid = true
    WHERE id = ANY(NEW.content_ids)
      AND organization_id = NEW.organization_id
      AND creator_id = NEW.user_id
      AND COALESCE(creator_paid, false) = false;

    -- Marcar editor_paid donde el usuario es el editor
    UPDATE public.content
    SET editor_paid = true
    WHERE id = ANY(NEW.content_ids)
      AND organization_id = NEW.organization_id
      AND editor_id = NEW.user_id
      AND COALESCE(editor_paid, false) = false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_content_paid ON public.talent_payments;

CREATE TRIGGER trigger_sync_content_paid
  AFTER INSERT OR UPDATE OF status
  ON public.talent_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_content_paid_on_payment();

COMMENT ON FUNCTION public.sync_content_paid_on_payment() IS
  'Sincroniza creator_paid/editor_paid en content cuando talent_payment.status pasa a paid. '
  'Resuelve el bug de pagos manuales que no marcaban el contenido como liquidado.';
