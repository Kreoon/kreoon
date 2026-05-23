-- Migration: managed_campaign_subscriptions
-- Date: 2026-05-23
-- Author: Alexander Cast
--
-- Registra los pagos de planes de campañas gestionadas (servicio UGC de KREOON).
-- El webhook de Stripe inserta en esta tabla al confirmar el pago de un plan.
-- user_id es text (no UUID FK) para soportar tanto usuarios Supabase Auth
-- como leads externos que pagaron antes de crear cuenta.

-- ============================================================
-- Tabla
-- ============================================================
CREATE TABLE IF NOT EXISTS public.managed_campaign_subscriptions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identidad del cliente
  user_id              TEXT,                            -- UUID de auth.users o identificador externo
  user_email           TEXT        NOT NULL,
  user_name            TEXT,

  -- Plan contratado
  plan                 TEXT        NOT NULL
    CHECK (plan IN ('inicio', 'crecimiento', 'escala')),
  currency             TEXT        NOT NULL DEFAULT 'USD'
    CHECK (currency IN ('USD', 'COP')),
  duration_months      INTEGER     NOT NULL
    CHECK (duration_months IN (1, 3, 6, 12)),
  total_paid           NUMERIC(14,2) NOT NULL CHECK (total_paid >= 0),

  -- Tracking Stripe
  stripe_session_id    TEXT        NOT NULL,
  stripe_payment_intent TEXT,

  -- Estado del servicio
  status               TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled', 'refunded')),

  -- Temporalidad
  starts_at            TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Índices
-- ============================================================

-- Búsqueda por cliente (el webhook y el panel de admin lo usan con frecuencia)
CREATE INDEX IF NOT EXISTS idx_mcs_user_id
  ON public.managed_campaign_subscriptions(user_id);

-- Búsqueda por email (útil antes de que el lead cree cuenta)
CREATE INDEX IF NOT EXISTS idx_mcs_user_email
  ON public.managed_campaign_subscriptions(user_email);

-- La unicidad en stripe_session_id previene inserciones duplicadas del webhook
CREATE UNIQUE INDEX IF NOT EXISTS idx_mcs_stripe_session_id
  ON public.managed_campaign_subscriptions(stripe_session_id);

-- Filtrado por estado y plan para dashboards de operaciones
CREATE INDEX IF NOT EXISTS idx_mcs_status_plan
  ON public.managed_campaign_subscriptions(status, plan);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.managed_campaign_subscriptions ENABLE ROW LEVEL SECURITY;

-- Admin (rol admin dentro de cualquier org) puede ver todos los registros
CREATE POLICY "Admins can view all managed_campaign_subscriptions"
  ON public.managed_campaign_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Admin puede insertar (webhook usa service_role, pero por si acaso)
CREATE POLICY "Admins can insert managed_campaign_subscriptions"
  ON public.managed_campaign_subscriptions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Admin puede actualizar (ej: cambiar status a cancelled/refunded)
CREATE POLICY "Admins can update managed_campaign_subscriptions"
  ON public.managed_campaign_subscriptions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- El propio usuario puede ver sus suscripciones (user_id guarda el UUID como text)
CREATE POLICY "Users can view own managed_campaign_subscriptions"
  ON public.managed_campaign_subscriptions
  FOR SELECT
  USING (user_id = auth.uid()::text);

-- Service role tiene acceso total (necesario para el webhook de Stripe)
CREATE POLICY "Service role full access on managed_campaign_subscriptions"
  ON public.managed_campaign_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- Trigger: mantener updated_at actualizado
-- ============================================================

-- Reutiliza update_updated_at() si ya existe en el schema; si no, la crea.
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_managed_campaign_subscriptions
  BEFORE UPDATE ON public.managed_campaign_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- Comentarios
-- ============================================================
COMMENT ON TABLE public.managed_campaign_subscriptions IS
  'Registro de pagos de planes de campañas gestionadas (servicio UGC de KREOON). '
  'El webhook de Stripe inserta aquí al confirmar cada Checkout Session. '
  'user_id es TEXT para aceptar UUIDs de Supabase Auth o IDs externos.';

COMMENT ON COLUMN public.managed_campaign_subscriptions.user_id IS
  'UUID del usuario en auth.users (como text) o identificador externo si aún no tiene cuenta.';

COMMENT ON COLUMN public.managed_campaign_subscriptions.plan IS
  'Plan contratado: inicio | crecimiento | escala';

COMMENT ON COLUMN public.managed_campaign_subscriptions.duration_months IS
  'Duración del plan en meses: 1, 3, 6 o 12';

COMMENT ON COLUMN public.managed_campaign_subscriptions.stripe_session_id IS
  'ID de la Stripe Checkout Session. UNIQUE para evitar inserciones duplicadas del webhook.';

COMMENT ON COLUMN public.managed_campaign_subscriptions.status IS
  'Estado del servicio: active | completed | cancelled | refunded';
