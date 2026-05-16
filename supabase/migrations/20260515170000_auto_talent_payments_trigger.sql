-- Migration: Auto talent payments trigger + payment notifications
-- Date: 2026-05-15
-- Author: Alexander Cast
--
-- Crea tres componentes:
--   1. Trigger en `content` que inserta automáticamente en `talent_payments`
--      cuando creator_paid o editor_paid cambian de false/null a true.
--   2. Tabla `talent_payment_notifications` para colar registros de WhatsApp pendientes.
--   3. Triggers en `talent_payments` que crean la notificación cuando status = 'paid'.


-- =====================================================
-- 1. Función y trigger: cierre automático desde content
-- =====================================================
--
-- Se dispara AFTER UPDATE en `content`.
-- Condición creator: creator_paid pasa a true, creator_id presente y creator_payment > 0.
-- Condición editor:  editor_paid pasa a true,  editor_id presente  y editor_payment  > 0.
-- Guarda de idempotencia: no inserta si ya existe un registro no-cancelado que
-- contenga ese content_id para el mismo user_id en la misma organización.

CREATE OR REPLACE FUNCTION public.auto_talent_payment_on_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── Creator ──────────────────────────────────────────────────────────
  IF (OLD.creator_paid IS DISTINCT FROM NEW.creator_paid)
     AND NEW.creator_paid = TRUE
     AND NEW.creator_id IS NOT NULL
     AND COALESCE(NEW.creator_payment, 0) > 0
  THEN
    -- Idempotencia: solo insertar si no existe ya un pago activo para este content
    IF NOT EXISTS (
      SELECT 1
      FROM public.talent_payments
      WHERE organization_id = NEW.organization_id
        AND user_id         = NEW.creator_id
        AND status         != 'cancelled'
        AND content_ids     @> ARRAY[NEW.id]
    ) THEN
      INSERT INTO public.talent_payments (
        organization_id,
        user_id,
        amount,
        currency,
        status,
        description,
        content_ids,
        payment_date,
        notes
      ) VALUES (
        NEW.organization_id,
        NEW.creator_id,
        NEW.creator_payment,
        COALESCE(NEW.creator_payment_currency::text, 'COP'),
        'paid',
        'Cierre automático: ' || COALESCE(NEW.sequence_number, '') || ' ' || COALESCE(NEW.title, 'Sin título'),
        ARRAY[NEW.id],
        NOW(),
        'Generado automáticamente al marcar como pagado'
      );
    END IF;
  END IF;

  -- ── Editor ───────────────────────────────────────────────────────────
  IF (OLD.editor_paid IS DISTINCT FROM NEW.editor_paid)
     AND NEW.editor_paid = TRUE
     AND NEW.editor_id IS NOT NULL
     AND COALESCE(NEW.editor_payment, 0) > 0
  THEN
    -- Idempotencia: solo insertar si no existe ya un pago activo para este content
    IF NOT EXISTS (
      SELECT 1
      FROM public.talent_payments
      WHERE organization_id = NEW.organization_id
        AND user_id         = NEW.editor_id
        AND status         != 'cancelled'
        AND content_ids     @> ARRAY[NEW.id]
    ) THEN
      INSERT INTO public.talent_payments (
        organization_id,
        user_id,
        amount,
        currency,
        status,
        description,
        content_ids,
        payment_date,
        notes
      ) VALUES (
        NEW.organization_id,
        NEW.editor_id,
        NEW.editor_payment,
        COALESCE(NEW.editor_payment_currency::text, 'COP'),
        'paid',
        'Cierre automático: ' || COALESCE(NEW.sequence_number, '') || ' ' || COALESCE(NEW.title, 'Sin título'),
        ARRAY[NEW.id],
        NOW(),
        'Generado automáticamente al marcar como pagado'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recrear trigger limpiamente
DROP TRIGGER IF EXISTS trigger_auto_talent_payment_on_paid ON public.content;
CREATE TRIGGER trigger_auto_talent_payment_on_paid
  AFTER UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_talent_payment_on_paid();

COMMENT ON FUNCTION public.auto_talent_payment_on_paid() IS
  'Genera registros en talent_payments cuando creator_paid o editor_paid cambian a true en content. '
  'Incluye guarda de idempotencia para evitar duplicados.';


-- =====================================================
-- 2. Tabla: talent_payment_notifications
-- =====================================================
--
-- Registra notificaciones de WhatsApp pendientes de envío
-- para cada pago registrado con status = ''paid''.

CREATE TABLE IF NOT EXISTS talent_payment_notifications (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id        uuid        NOT NULL REFERENCES talent_payments(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL,
  organization_id   uuid        NOT NULL,
  notification_type text        NOT NULL DEFAULT 'whatsapp',
  status            text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at           timestamptz,
  error_message     text,
  created_at        timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE talent_payment_notifications ENABLE ROW LEVEL SECURITY;

-- Miembros de la organización acceden a sus notificaciones
CREATE POLICY "org_member_notifications" ON talent_payment_notifications
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_talent_payment_notifications_payment
  ON talent_payment_notifications(payment_id);

-- Índice parcial: solo filas pendientes (hot path del worker de WhatsApp)
CREATE INDEX IF NOT EXISTS idx_talent_payment_notifications_pending
  ON talent_payment_notifications(status)
  WHERE status = 'pending';


-- =====================================================
-- 3. Función y triggers: notificación automática desde talent_payments
-- =====================================================
--
-- INSERT con status='paid'  → crea notificación inmediatamente.
-- UPDATE de non-paid a 'paid' → también crea notificación.

CREATE OR REPLACE FUNCTION public.auto_create_payment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' THEN
    INSERT INTO public.talent_payment_notifications (
      payment_id,
      user_id,
      organization_id
    ) VALUES (
      NEW.id,
      NEW.user_id,
      NEW.organization_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para INSERT directo con status='paid'
DROP TRIGGER IF EXISTS trigger_auto_payment_notification ON public.talent_payments;
CREATE TRIGGER trigger_auto_payment_notification
  AFTER INSERT ON public.talent_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_payment_notification();

-- Trigger para UPDATE de cualquier status → 'paid'
DROP TRIGGER IF EXISTS trigger_payment_status_to_paid_notification ON public.talent_payments;
CREATE TRIGGER trigger_payment_status_to_paid_notification
  AFTER UPDATE OF status ON public.talent_payments
  FOR EACH ROW
  WHEN (OLD.status != 'paid' AND NEW.status = 'paid')
  EXECUTE FUNCTION public.auto_create_payment_notification();

COMMENT ON FUNCTION public.auto_create_payment_notification() IS
  'Inserta un registro en talent_payment_notifications cuando un talent_payment '
  'llega al status paid, ya sea por INSERT directo o por cambio de status.';
