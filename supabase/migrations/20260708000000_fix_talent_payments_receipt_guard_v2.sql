-- Correccion de regresion introducida por 20260707000300:
--
-- El CHECK (status <> 'paid' OR receipt_url IS NOT NULL) aplicaba a TODOS
-- los INSERT/UPDATE, incluidos los mecanismos automaticos de nomina:
-- auto_talent_payment_on_paid (trigger sobre content) inserta directamente
-- con status='paid' y sin receipt_url ("Generado automaticamente al marcar
-- como pagado"). Con el CHECK activo, marcar creator_paid/editor_paid=true
-- en un contenido reventaba con 23514 -- flujo de pago por flags roto.
--
-- El hallazgo original del QA era otro: el UPDATE pending->paid del flujo
-- handleConfirmPaid (admin marca pagado un cierre existente) sin exigir
-- comprobante server-side. Ese es el unico camino que debe exigirlo.
--
-- Fix: quitar el CHECK, reemplazar por trigger BEFORE UPDATE que exige
-- receipt_url SOLO en la transicion a 'paid' desde otro estado. Los INSERT
-- directos como 'paid' (mecanismos automaticos, registros historicos
-- manuales) quedan permitidos, igual que antes del 20260707000300.
--
-- Verificado en vivo (transacciones con rollback):
-- 1. INSERT status='paid' sin receipt (camino del trigger automatico) -> pasa
-- 2. UPDATE pending->paid sin receipt -> 23514 bloqueado
-- 3. UPDATE pending->paid con receipt -> pasa
-- 4. UPDATE content SET creator_paid=true (dispara auto_talent_payment_on_paid) -> pasa

ALTER TABLE public.talent_payments
  DROP CONSTRAINT IF EXISTS talent_payments_paid_requires_receipt;

CREATE OR REPLACE FUNCTION public.trg_talent_payments_require_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid'
     AND OLD.status IS DISTINCT FROM 'paid'
     AND NEW.receipt_url IS NULL THEN
    RAISE EXCEPTION 'forbidden: marking a payment as paid requires a receipt_url'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_talent_payments_require_receipt ON public.talent_payments;
CREATE TRIGGER trg_talent_payments_require_receipt
  BEFORE UPDATE ON public.talent_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_talent_payments_require_receipt();
