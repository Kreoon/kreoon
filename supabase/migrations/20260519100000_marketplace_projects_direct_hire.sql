-- Migration: marketplace_projects_direct_hire
-- Date: 2026-05-19
-- Author: Alexander Cast
--
-- Permite que usuarios sin brand puedan crear proyectos de contratación
-- directa desde el marketplace. Agrega client_user_id, creation_mode,
-- columnas de Stripe y ajusta RLS para el nuevo flujo.

-- ============================================================
-- 1. Hacer brand_id nullable
-- ============================================================

-- Eliminar el NOT NULL de brand_id para permitir proyectos sin brand.
-- Los proyectos de contratación directa no tendrán brand_id.
ALTER TABLE public.marketplace_projects
  ALTER COLUMN brand_id DROP NOT NULL;

-- ============================================================
-- 2. Nuevas columnas
-- ============================================================

-- Usuario que contrata directamente (sin brand)
ALTER TABLE public.marketplace_projects
  ADD COLUMN IF NOT EXISTS client_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Modo de creación del proyecto
ALTER TABLE public.marketplace_projects
  ADD COLUMN IF NOT EXISTS creation_mode TEXT DEFAULT 'standard'
    CHECK (creation_mode IN ('standard', 'direct_hire', 'campaign'));

-- Tracking de pago con Stripe
ALTER TABLE public.marketplace_projects
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

ALTER TABLE public.marketplace_projects
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- ============================================================
-- 3. Ampliar el CHECK constraint de payment_status
-- ============================================================

-- PostgreSQL no permite ALTER CHECK directamente; hay que eliminar
-- y recrear el constraint. Primero identificamos y eliminamos el existente.

ALTER TABLE public.marketplace_projects
  DROP CONSTRAINT IF EXISTS marketplace_projects_payment_status_check;

ALTER TABLE public.marketplace_projects
  ADD CONSTRAINT marketplace_projects_payment_status_check
    CHECK (payment_status IN ('pending', 'escrow', 'released', 'refunded', 'paid'));

-- ============================================================
-- 4. Índices para las nuevas columnas
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_projects_client_user
  ON public.marketplace_projects(client_user_id)
  WHERE client_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_stripe_session
  ON public.marketplace_projects(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_stripe_payment_intent
  ON public.marketplace_projects(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_creation_mode
  ON public.marketplace_projects(creation_mode);

-- ============================================================
-- 5. RLS — DROP de políticas existentes que se van a reemplazar
-- ============================================================

-- SELECT: la política más reciente (definida en la migración ~línea 68000
-- del baseline) se amplía para incluir client_user_id.
DROP POLICY IF EXISTS "Project participants can view projects"
  ON public.marketplace_projects;

-- UPDATE: se amplía para incluir client_user_id.
DROP POLICY IF EXISTS "Project participants can update projects"
  ON public.marketplace_projects;

-- ============================================================
-- 6. RLS — Recrear política SELECT
-- ============================================================

CREATE POLICY "Project participants can view projects"
  ON public.marketplace_projects FOR SELECT
  USING (
    -- Participante directo (creator, editor, brand member)
    public.is_project_participant(id)
    -- El usuario que contrató directamente puede ver su proyecto
    OR client_user_id = auth.uid()
    -- El creador de la campaña origen puede ver el proyecto
    OR (
      campaign_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.marketplace_campaigns mc
        WHERE mc.id = marketplace_projects.campaign_id
          AND mc.created_by = auth.uid()
      )
    )
    -- Admin de la org de la campaña origen puede ver el proyecto
    OR (
      campaign_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.marketplace_campaigns mc
        WHERE mc.id = marketplace_projects.campaign_id
          AND mc.organization_id IS NOT NULL
          AND public.is_org_admin(mc.organization_id)
      )
    )
  );

-- ============================================================
-- 7. RLS — Nueva política INSERT para contratación directa
-- ============================================================

-- Se mantiene la política "Brand members can create projects" existente
-- (no se toca). Se agrega una segunda política para usuarios sin brand.

CREATE POLICY "Clients can create direct hire projects"
  ON public.marketplace_projects FOR INSERT
  WITH CHECK (
    brand_id IS NULL
    AND client_user_id = auth.uid()
    AND creation_mode = 'direct_hire'
  );

-- ============================================================
-- 8. RLS — Recrear política UPDATE
-- ============================================================

CREATE POLICY "Project participants can update projects"
  ON public.marketplace_projects FOR UPDATE
  USING (
    -- Participante directo (creator, editor, brand member)
    public.is_project_participant(id)
    -- El usuario que contrató directamente puede actualizar su proyecto
    OR client_user_id = auth.uid()
  );
