-- =============================================
-- TABLAS NUEVAS PARA MÓDULO MARKETING MEJORADO
-- =============================================

-- 1. ESTRATEGIAS DE MARKETING
CREATE TABLE public.marketing_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  
  -- Objetivo de negocio
  business_objective TEXT,
  business_objective_type TEXT DEFAULT 'sales',
  
  -- Avatar / Buyer Persona
  buyer_persona JSONB DEFAULT '[]'::jsonb,
  
  -- Propuesta de valor
  value_proposition TEXT,
  
  -- Oferta principal
  main_offer TEXT,
  main_offer_details JSONB DEFAULT '{}'::jsonb,
  
  -- Funnel (TOFU/MOFU/BOFU)
  funnel_tofu JSONB DEFAULT '{}'::jsonb,
  funnel_mofu JSONB DEFAULT '{}'::jsonb,
  funnel_bofu JSONB DEFAULT '{}'::jsonb,
  
  -- KPIs estratégicos
  strategic_kpis JSONB DEFAULT '[]'::jsonb,
  
  -- Contenido editable estilo Notion
  strategy_blocks JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  status TEXT DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CANALES DE TRÁFICO
CREATE TABLE public.traffic_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  channel_type TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  
  status TEXT DEFAULT 'active',
  monthly_budget NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'COP',
  
  objective TEXT,
  responsible_id UUID REFERENCES public.profiles(id),
  responsible_type TEXT DEFAULT 'internal',
  agency_name TEXT,
  
  api_connected BOOLEAN DEFAULT false,
  api_config JSONB DEFAULT '{}'::jsonb,
  
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. LOGS DE SINCRONIZACIÓN
CREATE TABLE public.traffic_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.traffic_channels(id) ON DELETE CASCADE,
  
  sync_type TEXT NOT NULL,
  sync_date DATE NOT NULL,
  
  investment NUMERIC DEFAULT 0,
  leads INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  cpa NUMERIC,
  roas NUMERIC,
  ctr NUMERIC,
  cpc NUMERIC,
  
  raw_data JSONB DEFAULT '{}'::jsonb,
  source_file TEXT,
  notes TEXT,
  
  synced_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. INSIGHTS DE IA
CREATE TABLE public.marketing_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  insight_type TEXT NOT NULL,
  category TEXT,
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  severity TEXT DEFAULT 'info',
  
  related_channel_id UUID REFERENCES public.traffic_channels(id),
  related_campaign_id UUID REFERENCES public.marketing_campaigns(id),
  
  data_context JSONB DEFAULT '{}'::jsonb,
  
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  is_actionable BOOLEAN DEFAULT true,
  action_taken TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. DASHBOARD MARKETING (CONFIGURACIÓN)
CREATE TABLE public.marketing_dashboard_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  main_objective_type TEXT DEFAULT 'sales',
  main_objective_value NUMERIC,
  main_objective_period TEXT DEFAULT 'monthly',
  
  monthly_investment NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'COP',
  
  estimated_roi NUMERIC,
  
  visible_widgets JSONB DEFAULT '["objective", "investment", "roi", "channels", "traffic", "conversions"]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id)
);

-- =============================================
-- MEJORAR TABLAS EXISTENTES
-- =============================================

-- Agregar campos a marketing_campaigns si no existen
ALTER TABLE public.marketing_campaigns 
  ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.traffic_channels(id),
  ADD COLUMN IF NOT EXISTS objective_details TEXT,
  ADD COLUMN IF NOT EXISTS spent NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_result JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS actual_result JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS content_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Agregar campos a marketing_reports si no existen
ALTER TABLE public.marketing_reports 
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS charts_data JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recommendations JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_token TEXT,
  ADD COLUMN IF NOT EXISTS shared_with UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_marketing_strategies_org ON public.marketing_strategies(organization_id);
CREATE INDEX IF NOT EXISTS idx_traffic_channels_org ON public.traffic_channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_traffic_sync_logs_org ON public.traffic_sync_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_traffic_sync_logs_channel ON public.traffic_sync_logs(channel_id);
CREATE INDEX IF NOT EXISTS idx_traffic_sync_logs_date ON public.traffic_sync_logs(sync_date);
CREATE INDEX IF NOT EXISTS idx_marketing_ai_insights_org ON public.marketing_ai_insights(organization_id);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.marketing_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_dashboard_config ENABLE ROW LEVEL SECURITY;

-- MARKETING STRATEGIES
CREATE POLICY "Org members can view strategies"
  ON public.marketing_strategies FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Strategists and admins can manage strategies"
  ON public.marketing_strategies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_member_roles omr
      WHERE omr.organization_id = marketing_strategies.organization_id
        AND omr.user_id = auth.uid()
        AND omr.role IN ('admin', 'strategist')
    )
    OR is_org_owner(auth.uid(), organization_id)
  );

-- TRAFFIC CHANNELS
CREATE POLICY "Org members can view traffic channels"
  ON public.traffic_channels FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Strategists and admins can manage traffic channels"
  ON public.traffic_channels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_member_roles omr
      WHERE omr.organization_id = traffic_channels.organization_id
        AND omr.user_id = auth.uid()
        AND omr.role IN ('admin', 'strategist')
    )
    OR is_org_owner(auth.uid(), organization_id)
  );

-- TRAFFIC SYNC LOGS
CREATE POLICY "Org members can view sync logs"
  ON public.traffic_sync_logs FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Strategists and admins can manage sync logs"
  ON public.traffic_sync_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_member_roles omr
      WHERE omr.organization_id = traffic_sync_logs.organization_id
        AND omr.user_id = auth.uid()
        AND omr.role IN ('admin', 'strategist')
    )
    OR is_org_owner(auth.uid(), organization_id)
  );

-- MARKETING AI INSIGHTS
CREATE POLICY "Org members can view marketing insights"
  ON public.marketing_ai_insights FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "System and admins can manage marketing insights"
  ON public.marketing_ai_insights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_member_roles omr
      WHERE omr.organization_id = marketing_ai_insights.organization_id
        AND omr.user_id = auth.uid()
        AND omr.role = 'admin'
    )
    OR is_org_owner(auth.uid(), organization_id)
  );

-- MARKETING DASHBOARD CONFIG
CREATE POLICY "Org members can view marketing dashboard config"
  ON public.marketing_dashboard_config FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Strategists and admins can manage marketing dashboard config"
  ON public.marketing_dashboard_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_member_roles omr
      WHERE omr.organization_id = marketing_dashboard_config.organization_id
        AND omr.user_id = auth.uid()
        AND omr.role IN ('admin', 'strategist')
    )
    OR is_org_owner(auth.uid(), organization_id)
  );

-- =============================================
-- TRIGGERS
-- =============================================
CREATE TRIGGER update_marketing_strategies_updated_at
  BEFORE UPDATE ON public.marketing_strategies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_traffic_channels_updated_at
  BEFORE UPDATE ON public.traffic_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketing_dashboard_config_updated_at
  BEFORE UPDATE ON public.marketing_dashboard_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();