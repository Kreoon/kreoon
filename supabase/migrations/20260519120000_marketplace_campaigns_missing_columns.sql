-- Migration: marketplace_campaigns_missing_columns
-- Date: 2026-05-19
-- Author: Alexander Cast
--
-- Agrega columnas que estaban faltando en marketplace_campaigns y que el
-- código del frontend y las edge functions ya referencian.
-- Usa IF NOT EXISTS en todo para evitar errores si ya existen en la DB live.

-- ============================================================
-- 1. Hacer brand_id nullable
-- ============================================================
-- Permite crear campañas sin brand (clientes sin organización de marca)
ALTER TABLE public.marketplace_campaigns
  ALTER COLUMN brand_id DROP NOT NULL;

-- ============================================================
-- 2. Identificadores adicionales
-- ============================================================
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- ============================================================
-- 3. Tipo de colaboración (wizard paso "¿Qué esperas del creador?")
-- ============================================================
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS collaboration_type TEXT DEFAULT 'ugc_only'
    CHECK (collaboration_type IN ('ugc_only', 'post_required', 'post_optional'));

-- ============================================================
-- 4. Configuración de aplicaciones
-- ============================================================
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS requires_portfolio BOOLEAN DEFAULT true;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS auto_approve_applications BOOLEAN DEFAULT false;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS max_applications INTEGER;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS current_applications INTEGER DEFAULT 0;

-- ============================================================
-- 5. Visibilidad
-- ============================================================
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public'
    CHECK (visibility IN ('public', 'private', 'organization'));

-- ============================================================
-- 6. Comisión y gestión de contenido
-- ============================================================
-- commission_rate: % que KREOON cobra sobre el total del creador
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 30;

-- content_management_type: quién gestiona el contenido
-- 'kreoon' → KREOON escribe guiones y gestiona todo (comisión mayor)
-- 'self'   → el cliente gestiona su contenido (comisión estándar)
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS content_management_type TEXT DEFAULT 'kreoon'
    CHECK (content_management_type IN ('kreoon', 'self'));

-- ============================================================
-- 7. Estado de pago
-- ============================================================
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending_payment', 'paid', 'refunded'));

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS requires_agency_support BOOLEAN DEFAULT false;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS escrow_hold_id TEXT;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS total_paid NUMERIC(10,2) DEFAULT 0;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- ============================================================
-- 8. Campos de brief y marca
-- ============================================================
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS brief TEXT;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS brand_name_override TEXT;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS brand_logo_override TEXT;

-- ============================================================
-- 9. Campos de compensación adicional
-- ============================================================
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS compensation_type TEXT;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS compensation_description TEXT;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS product_value NUMERIC(10,2);

-- ============================================================
-- 10. Plazos adicionales
-- ============================================================
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMPTZ;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS content_deadline TIMESTAMPTZ;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS campaign_start_date TIMESTAMPTZ;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS campaign_end_date TIMESTAMPTZ;

-- ============================================================
-- 11. Flags de campaña
-- ============================================================
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS allow_counter_offers BOOLEAN DEFAULT false;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS nda_required BOOLEAN DEFAULT false;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS usage_rights TEXT DEFAULT 'platform_only';

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS usage_rights_description TEXT;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS campaign_purpose TEXT DEFAULT 'content';

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS is_brand_activation BOOLEAN DEFAULT false;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS activation_config JSONB;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS content_guidelines TEXT;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS reference_urls TEXT[] DEFAULT '{}';

-- ============================================================
-- 12. Índices para nuevas columnas frecuentemente filtradas
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_campaigns_client_id
  ON public.marketplace_campaigns(client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id
  ON public.marketplace_campaigns(organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_payment_status
  ON public.marketplace_campaigns(payment_status);

CREATE INDEX IF NOT EXISTS idx_campaigns_content_management
  ON public.marketplace_campaigns(content_management_type);
