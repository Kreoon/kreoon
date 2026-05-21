-- Fix B + C: al crear un Fillmaker con editor asignado y cost_own > 0,
-- se genera automáticamente un talent_payment pendiente para ese editor.

-- ── 1. Columna de trazabilidad en talent_payments ──────────────────────────
ALTER TABLE public.talent_payments
  ADD COLUMN IF NOT EXISTS fillmaker_service_id UUID
    REFERENCES public.fillmaker_services(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_talent_payments_fillmaker
  ON public.talent_payments(fillmaker_service_id)
  WHERE fillmaker_service_id IS NOT NULL;

-- ── 2. Función trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fillmaker_auto_talent_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.editor_id IS NOT NULL AND NEW.cost_own > 0 THEN
      INSERT INTO talent_payments (
        organization_id, user_id, amount, currency, status,
        description, fillmaker_service_id, created_by
      ) VALUES (
        NEW.organization_id,
        NEW.editor_id,
        NEW.cost_own,
        COALESCE(NEW.currency, 'COP'),
        'pending',
        'Fillmaker: ' || NEW.title,
        NEW.id,
        NEW.created_by
      );
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Removieron el editor o pusieron cost_own = 0 → cancelar pago pendiente
    IF (NEW.editor_id IS NULL OR NEW.cost_own = 0)
      AND (OLD.editor_id IS NOT NULL AND OLD.cost_own > 0)
    THEN
      UPDATE talent_payments
      SET status = 'cancelled', updated_at = now()
      WHERE fillmaker_service_id = NEW.id AND status = 'pending';

    ELSIF NEW.editor_id IS NOT NULL AND NEW.cost_own > 0 THEN
      -- Actualizar pago pendiente existente
      IF EXISTS (
        SELECT 1 FROM talent_payments
        WHERE fillmaker_service_id = NEW.id AND status = 'pending'
      ) THEN
        UPDATE talent_payments
        SET user_id      = NEW.editor_id,
            amount       = NEW.cost_own,
            currency     = COALESCE(NEW.currency, 'COP'),
            description  = 'Fillmaker: ' || NEW.title,
            updated_at   = now()
        WHERE fillmaker_service_id = NEW.id AND status = 'pending';

      -- Crear pago si no hay ninguno activo (puede haberse cancelado antes)
      ELSIF NOT EXISTS (
        SELECT 1 FROM talent_payments
        WHERE fillmaker_service_id = NEW.id
          AND status NOT IN ('cancelled')
      ) THEN
        INSERT INTO talent_payments (
          organization_id, user_id, amount, currency, status,
          description, fillmaker_service_id, created_by
        ) VALUES (
          NEW.organization_id,
          NEW.editor_id,
          NEW.cost_own,
          COALESCE(NEW.currency, 'COP'),
          'pending',
          'Fillmaker: ' || NEW.title,
          NEW.id,
          NEW.created_by
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fillmaker_talent_payment ON public.fillmaker_services;

CREATE TRIGGER trg_fillmaker_talent_payment
  AFTER INSERT OR UPDATE ON public.fillmaker_services
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fillmaker_auto_talent_payment();

-- ── 3. Backfill: crear talent_payments para fillmakers existentes sin pago ───
-- WARNING FIX: incluir payment_date para registros backfilled (era NULL antes).
-- Se usa created_at del fillmaker_service como fecha de pago; fallback a now().
INSERT INTO public.talent_payments (
  organization_id, user_id, amount, currency, status,
  description, fillmaker_service_id, created_by,
  payment_date
)
SELECT
  f.organization_id,
  f.editor_id,
  f.cost_own,
  COALESCE(f.currency, 'COP'),
  CASE WHEN f.billing_status = 'paid' THEN 'paid' ELSE 'pending' END,
  'Fillmaker: ' || f.title,
  f.id,
  f.created_by,
  COALESCE(f.created_at, now())
FROM public.fillmaker_services f
WHERE f.editor_id IS NOT NULL
  AND f.cost_own > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.talent_payments tp
    WHERE tp.fillmaker_service_id = f.id
  );
