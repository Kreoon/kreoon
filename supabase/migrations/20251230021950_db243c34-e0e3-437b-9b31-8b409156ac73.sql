-- =============================================
-- LIVE STREAMING MODULE - DATABASE SCHEMA
-- Multi-tenant, scalable, with RBAC
-- =============================================

-- 1. Create enum for owner types
CREATE TYPE streaming_owner_type AS ENUM ('platform', 'organization');

-- 2. Create enum for streaming platforms
CREATE TYPE streaming_platform AS ENUM ('youtube', 'facebook', 'tiktok', 'twitch', 'instagram', 'linkedin', 'custom_rtmp');

-- 3. Create enum for streaming providers
CREATE TYPE streaming_provider AS ENUM ('restream', 'watchity', 'custom_rtmp');

-- 4. Create enum for event types
CREATE TYPE streaming_event_type AS ENUM ('informative', 'shopping', 'webinar', 'interview');

-- 5. Create enum for event status
CREATE TYPE streaming_event_status AS ENUM ('draft', 'scheduled', 'live', 'ended', 'cancelled');

-- 6. Create enum for sale status
CREATE TYPE streaming_sale_status AS ENUM ('quoted', 'sold', 'executed', 'paid', 'cancelled');

-- =============================================
-- STREAMING PROVIDERS CONFIGURATION
-- =============================================
CREATE TABLE public.streaming_providers_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type streaming_owner_type NOT NULL DEFAULT 'platform',
  owner_id UUID, -- NULL for platform, organization_id for orgs
  provider streaming_provider NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL DEFAULT 'test' CHECK (mode IN ('test', 'production')),
  api_key_encrypted TEXT,
  client_id TEXT,
  client_secret_encrypted TEXT,
  webhook_url TEXT,
  extra_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(owner_type, owner_id, provider)
);

-- =============================================
-- STREAMING ACCOUNTS (Connected Channels)
-- =============================================
CREATE TABLE public.streaming_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type streaming_owner_type NOT NULL DEFAULT 'platform',
  owner_id UUID, -- NULL for platform, organization_id for orgs
  provider streaming_provider NOT NULL,
  platform_type streaming_platform NOT NULL,
  account_name TEXT NOT NULL,
  account_external_id TEXT,
  account_url TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'expired', 'error', 'disconnected')),
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  connected_by UUID REFERENCES auth.users(id)
);

-- Index for quick lookups
CREATE INDEX idx_streaming_accounts_owner ON public.streaming_accounts(owner_type, owner_id);
CREATE INDEX idx_streaming_accounts_status ON public.streaming_accounts(status);

-- =============================================
-- STREAMING EVENTS
-- =============================================
CREATE TABLE public.streaming_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type streaming_owner_type NOT NULL DEFAULT 'platform',
  owner_id UUID, -- NULL for platform, organization_id for orgs
  client_id UUID REFERENCES public.clients(id),
  title TEXT NOT NULL,
  description TEXT,
  event_type streaming_event_type NOT NULL DEFAULT 'informative',
  status streaming_event_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  target_channels UUID[] DEFAULT '{}', -- Array of streaming_accounts ids
  stream_key TEXT,
  rtmp_url TEXT,
  thumbnail_url TEXT,
  is_shopping_enabled BOOLEAN DEFAULT false,
  -- AI-ready fields
  ai_generated_title TEXT,
  ai_generated_description TEXT,
  ai_suggested_time TIMESTAMPTZ,
  ai_analysis JSONB,
  -- Metrics
  peak_viewers INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  engagement_score NUMERIC(5,2),
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_streaming_events_owner ON public.streaming_events(owner_type, owner_id);
CREATE INDEX idx_streaming_events_status ON public.streaming_events(status);
CREATE INDEX idx_streaming_events_scheduled ON public.streaming_events(scheduled_at);
CREATE INDEX idx_streaming_events_client ON public.streaming_events(client_id);

-- =============================================
-- STREAMING EVENT PRODUCTS (Live Shopping)
-- =============================================
CREATE TABLE public.streaming_event_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.streaming_events(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_image_url TEXT,
  price NUMERIC(12,2),
  currency TEXT DEFAULT 'COP',
  cta_text TEXT DEFAULT 'Comprar ahora',
  cta_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  -- Tracking
  clicks_count INTEGER DEFAULT 0,
  conversions_count INTEGER DEFAULT 0,
  revenue_generated NUMERIC(12,2) DEFAULT 0,
  -- AI-ready
  ai_suggested_cta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_streaming_event_products_event ON public.streaming_event_products(event_id);

-- =============================================
-- STREAMING SALES (Monetization)
-- =============================================
CREATE TABLE public.streaming_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type streaming_owner_type NOT NULL DEFAULT 'platform',
  owner_id UUID,
  client_id UUID REFERENCES public.clients(id),
  event_id UUID REFERENCES public.streaming_events(id),
  sale_type TEXT NOT NULL DEFAULT 'live_service' CHECK (sale_type IN ('live_service', 'subscription', 'per_event', 'channel_rental')),
  status streaming_sale_status NOT NULL DEFAULT 'quoted',
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'COP',
  description TEXT,
  notes TEXT,
  quoted_at TIMESTAMPTZ DEFAULT now(),
  sold_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  invoice_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_streaming_sales_owner ON public.streaming_sales(owner_type, owner_id);
CREATE INDEX idx_streaming_sales_client ON public.streaming_sales(client_id);
CREATE INDEX idx_streaming_sales_status ON public.streaming_sales(status);

-- =============================================
-- STREAMING LOGS
-- =============================================
CREATE TABLE public.streaming_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type streaming_owner_type NOT NULL DEFAULT 'platform',
  owner_id UUID,
  event_id UUID REFERENCES public.streaming_events(id),
  account_id UUID REFERENCES public.streaming_accounts(id),
  log_type TEXT NOT NULL CHECK (log_type IN ('channel_connected', 'channel_disconnected', 'token_expired', 'live_started', 'live_ended', 'error', 'warning', 'info')),
  message TEXT NOT NULL,
  details JSONB,
  provider streaming_provider,
  platform_type streaming_platform,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_streaming_logs_owner ON public.streaming_logs(owner_type, owner_id);
CREATE INDEX idx_streaming_logs_event ON public.streaming_logs(event_id);
CREATE INDEX idx_streaming_logs_type ON public.streaming_logs(log_type);
CREATE INDEX idx_streaming_logs_created ON public.streaming_logs(created_at DESC);

-- =============================================
-- ORGANIZATION STREAMING CONFIG (Phase 2 ready)
-- =============================================
CREATE TABLE public.organization_streaming_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  allowed_providers streaming_provider[] DEFAULT '{}',
  can_transmit BOOLEAN DEFAULT false,
  can_resell BOOLEAN DEFAULT false,
  can_live_shopping BOOLEAN DEFAULT false,
  max_channels INTEGER DEFAULT 3,
  max_concurrent_streams INTEGER DEFAULT 1,
  monthly_minutes_limit INTEGER,
  used_minutes_this_month INTEGER DEFAULT 0,
  billing_day INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.streaming_providers_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaming_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaming_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaming_event_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaming_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaming_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_streaming_config ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is platform admin (root or admin role)
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  ) OR (
    SELECT email = 'admin@kreoon.com' 
    FROM auth.users WHERE id = _user_id
  );
$$;

-- streaming_providers_config policies
CREATE POLICY "Platform admins can manage all provider configs"
ON public.streaming_providers_config FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Org owners can manage their provider configs"
ON public.streaming_providers_config FOR ALL
USING (
  owner_type = 'organization' 
  AND owner_id IS NOT NULL 
  AND is_org_owner(auth.uid(), owner_id)
  AND EXISTS (
    SELECT 1 FROM public.organization_streaming_config 
    WHERE organization_id = owner_id AND is_enabled = true
  )
)
WITH CHECK (
  owner_type = 'organization' 
  AND owner_id IS NOT NULL 
  AND is_org_owner(auth.uid(), owner_id)
);

-- streaming_accounts policies
CREATE POLICY "Platform admins can manage all accounts"
ON public.streaming_accounts FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Org owners can manage their accounts"
ON public.streaming_accounts FOR ALL
USING (
  owner_type = 'organization' 
  AND owner_id IS NOT NULL 
  AND is_org_owner(auth.uid(), owner_id)
  AND EXISTS (
    SELECT 1 FROM public.organization_streaming_config 
    WHERE organization_id = owner_id AND is_enabled = true
  )
)
WITH CHECK (
  owner_type = 'organization' 
  AND owner_id IS NOT NULL 
  AND is_org_owner(auth.uid(), owner_id)
);

CREATE POLICY "Org members can view their accounts"
ON public.streaming_accounts FOR SELECT
USING (
  owner_type = 'organization' 
  AND owner_id IS NOT NULL 
  AND is_org_member(auth.uid(), owner_id)
);

-- streaming_events policies
CREATE POLICY "Platform admins can manage all events"
ON public.streaming_events FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Org owners can manage their events"
ON public.streaming_events FOR ALL
USING (
  owner_type = 'organization' 
  AND owner_id IS NOT NULL 
  AND is_org_owner(auth.uid(), owner_id)
)
WITH CHECK (
  owner_type = 'organization' 
  AND owner_id IS NOT NULL 
  AND is_org_owner(auth.uid(), owner_id)
);

CREATE POLICY "Org members can view their events"
ON public.streaming_events FOR SELECT
USING (
  owner_type = 'organization' 
  AND owner_id IS NOT NULL 
  AND is_org_member(auth.uid(), owner_id)
);

-- streaming_event_products policies
CREATE POLICY "Platform admins can manage all event products"
ON public.streaming_event_products FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Users can manage products for their events"
ON public.streaming_event_products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.streaming_events e
    WHERE e.id = event_id
    AND (
      is_platform_admin(auth.uid())
      OR (e.owner_type = 'organization' AND is_org_owner(auth.uid(), e.owner_id))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.streaming_events e
    WHERE e.id = event_id
    AND (
      is_platform_admin(auth.uid())
      OR (e.owner_type = 'organization' AND is_org_owner(auth.uid(), e.owner_id))
    )
  )
);

-- streaming_sales policies
CREATE POLICY "Platform admins can manage all sales"
ON public.streaming_sales FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Org owners can manage their sales"
ON public.streaming_sales FOR ALL
USING (
  owner_type = 'organization' 
  AND owner_id IS NOT NULL 
  AND is_org_owner(auth.uid(), owner_id)
)
WITH CHECK (
  owner_type = 'organization' 
  AND owner_id IS NOT NULL 
  AND is_org_owner(auth.uid(), owner_id)
);

CREATE POLICY "Org members can view their sales"
ON public.streaming_sales FOR SELECT
USING (
  owner_type = 'organization' 
  AND owner_id IS NOT NULL 
  AND is_org_member(auth.uid(), owner_id)
);

-- streaming_logs policies
CREATE POLICY "Platform admins can view all logs"
ON public.streaming_logs FOR SELECT
USING (is_platform_admin(auth.uid()));

CREATE POLICY "System can insert logs"
ON public.streaming_logs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Org owners can view their logs"
ON public.streaming_logs FOR SELECT
USING (
  owner_type = 'organization' 
  AND owner_id IS NOT NULL 
  AND is_org_owner(auth.uid(), owner_id)
);

-- organization_streaming_config policies
CREATE POLICY "Platform admins can manage all org streaming configs"
ON public.organization_streaming_config FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Org owners can view their streaming config"
ON public.organization_streaming_config FOR SELECT
USING (is_org_owner(auth.uid(), organization_id));

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================
CREATE TRIGGER update_streaming_providers_config_updated_at
  BEFORE UPDATE ON public.streaming_providers_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_streaming_accounts_updated_at
  BEFORE UPDATE ON public.streaming_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_streaming_events_updated_at
  BEFORE UPDATE ON public.streaming_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_streaming_event_products_updated_at
  BEFORE UPDATE ON public.streaming_event_products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_streaming_sales_updated_at
  BEFORE UPDATE ON public.streaming_sales
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_org_streaming_config_updated_at
  BEFORE UPDATE ON public.organization_streaming_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- INSERT FEATURE FLAG
-- =============================================
INSERT INTO public.app_settings (key, value, description)
VALUES ('live_streaming_enabled', 'false', 'Feature flag global para habilitar Live Streaming para organizaciones. Solo editable por Root.')
ON CONFLICT (key) DO NOTHING;