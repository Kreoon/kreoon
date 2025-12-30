-- =====================================================
-- KREOON Live Streaming - Missing Tables Only
-- =====================================================

-- Feature flags for platform, organization, and client level
CREATE TABLE IF NOT EXISTS public.live_feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('platform', 'organization', 'client')),
  entity_id UUID,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

-- Hour wallets for organizations and clients
CREATE TABLE IF NOT EXISTS public.live_hour_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('platform', 'organization', 'client')),
  owner_id UUID NOT NULL,
  total_hours NUMERIC NOT NULL DEFAULT 0,
  used_hours NUMERIC NOT NULL DEFAULT 0,
  reserved_hours NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_type, owner_id)
);

-- Packages that organizations can offer to clients
CREATE TABLE IF NOT EXISTS public.live_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  hours_included NUMERIC NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'COP',
  is_active BOOLEAN NOT NULL DEFAULT true,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Hour purchases by organizations from platform
CREATE TABLE IF NOT EXISTS public.live_hour_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  hours_purchased NUMERIC NOT NULL,
  price_paid NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  purchased_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Hour assignments from organization to clients
CREATE TABLE IF NOT EXISTS public.live_hour_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  package_id UUID,
  hours_assigned NUMERIC NOT NULL,
  assigned_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event creators - assigns creators to streaming events
CREATE TABLE IF NOT EXISTS public.live_event_creators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'host',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, creator_id)
);

-- Usage logs for tracking hour consumption
CREATE TABLE IF NOT EXISTS public.live_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  client_id UUID,
  event_id UUID,
  action TEXT NOT NULL,
  hours_consumed NUMERIC DEFAULT 0,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- Enable RLS on new tables
-- =====================================================
ALTER TABLE public.live_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_hour_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_hour_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_hour_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_event_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_usage_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies
-- =====================================================

-- live_feature_flags
CREATE POLICY "Admins manage feature flags" ON public.live_feature_flags FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view feature flags" ON public.live_feature_flags FOR SELECT USING (true);

-- live_hour_wallets
CREATE POLICY "Admins manage wallets" ON public.live_hour_wallets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org members view org wallets" ON public.live_hour_wallets FOR SELECT USING (
  owner_type = 'organization' AND is_org_member(auth.uid(), owner_id)
);

-- live_packages
CREATE POLICY "Org members view packages" ON public.live_packages FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org owners manage packages" ON public.live_packages FOR ALL USING (is_org_owner(auth.uid(), organization_id));
CREATE POLICY "Admins manage all packages" ON public.live_packages FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- live_hour_purchases
CREATE POLICY "Org members view purchases" ON public.live_hour_purchases FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Admins manage purchases" ON public.live_hour_purchases FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- live_hour_assignments
CREATE POLICY "Org members view assignments" ON public.live_hour_assignments FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org owners manage assignments" ON public.live_hour_assignments FOR ALL USING (is_org_owner(auth.uid(), organization_id));
CREATE POLICY "Admins manage all assignments" ON public.live_hour_assignments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- live_event_creators
CREATE POLICY "Anyone view event creators" ON public.live_event_creators FOR SELECT USING (true);
CREATE POLICY "Admins manage event creators" ON public.live_event_creators FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- live_usage_logs
CREATE POLICY "Org members view usage logs" ON public.live_usage_logs FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "System insert usage logs" ON public.live_usage_logs FOR INSERT WITH CHECK (true);

-- =====================================================
-- Insert default platform feature flag (enabled)
-- =====================================================
INSERT INTO public.live_feature_flags (entity_type, entity_id, is_enabled)
VALUES ('platform', NULL, true)
ON CONFLICT (entity_type, entity_id) DO UPDATE SET is_enabled = true;