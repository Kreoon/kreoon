-- =============================================
-- MARKETING & STRATEGY MODULE
-- =============================================

-- Table: marketing_clients - Clients with marketing/strategy services
CREATE TABLE public.marketing_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  strategist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Service status
  is_active BOOLEAN NOT NULL DEFAULT true,
  service_type TEXT NOT NULL DEFAULT 'full_service', -- full_service, strategy_only, traffic_only, social_media
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  
  -- Budget configuration
  monthly_budget NUMERIC(12,2) DEFAULT 0,
  budget_currency TEXT DEFAULT 'COP',
  
  -- Platforms active
  platforms JSONB DEFAULT '[]'::jsonb, -- ["facebook", "instagram", "tiktok", "google_ads", "youtube"]
  
  -- KPIs and objectives
  objectives JSONB DEFAULT '[]'::jsonb, -- [{type: "reach", target: 100000}, {type: "conversions", target: 500}]
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  
  UNIQUE(organization_id, client_id)
);

-- Table: marketing_campaigns - Campaign management
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  marketing_client_id UUID NOT NULL REFERENCES public.marketing_clients(id) ON DELETE CASCADE,
  
  -- Campaign details
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL DEFAULT 'awareness', -- awareness, engagement, conversion, retention, traffic
  status TEXT NOT NULL DEFAULT 'planning', -- planning, active, paused, completed, cancelled
  
  -- Budget
  budget NUMERIC(12,2) DEFAULT 0,
  spent NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'COP',
  
  -- Dates
  start_date DATE,
  end_date DATE,
  
  -- Platforms for this campaign
  platforms JSONB DEFAULT '[]'::jsonb,
  
  -- Objectives and KPIs
  objectives JSONB DEFAULT '[]'::jsonb,
  
  -- Results/Metrics
  metrics JSONB DEFAULT '{}'::jsonb, -- {impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpc: 0, etc}
  
  -- Assigned team
  strategist_id UUID REFERENCES public.profiles(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Table: marketing_content_calendar - Content planning calendar
CREATE TABLE public.marketing_content_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  marketing_client_id UUID NOT NULL REFERENCES public.marketing_clients(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  
  -- Content details
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'post', -- post, story, reel, video, ad, carousel, live
  
  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  status TEXT NOT NULL DEFAULT 'planned', -- planned, in_progress, ready, published, cancelled
  
  -- Platform
  platform TEXT NOT NULL, -- facebook, instagram, tiktok, youtube, linkedin, twitter
  
  -- Content reference
  content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
  media_urls JSONB DEFAULT '[]'::jsonb,
  copy_text TEXT,
  hashtags TEXT[],
  
  -- Publishing info
  published_at TIMESTAMP WITH TIME ZONE,
  published_url TEXT,
  
  -- Performance (post-publish)
  performance JSONB DEFAULT '{}'::jsonb, -- {reach: 0, likes: 0, comments: 0, shares: 0, saves: 0}
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Table: marketing_reports - Analytics and reports
CREATE TABLE public.marketing_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  marketing_client_id UUID NOT NULL REFERENCES public.marketing_clients(id) ON DELETE CASCADE,
  
  -- Report info
  title TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'monthly', -- weekly, monthly, campaign, custom
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Metrics summary
  metrics JSONB DEFAULT '{}'::jsonb,
  
  -- Platforms breakdown
  platforms_data JSONB DEFAULT '{}'::jsonb,
  
  -- Campaigns included
  campaign_ids UUID[] DEFAULT '{}',
  
  -- Report status
  status TEXT NOT NULL DEFAULT 'draft', -- draft, published
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes and recommendations
  notes TEXT,
  recommendations TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS on all tables
ALTER TABLE public.marketing_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketing_clients
CREATE POLICY "Org members can view marketing clients"
  ON public.marketing_clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_clients.organization_id
      AND om.user_id = auth.uid()
    )
    OR
    -- Client users can view their own marketing data
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = marketing_clients.client_id
      AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Strategists and admins can manage marketing clients"
  ON public.marketing_clients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_clients.organization_id
      AND om.user_id = auth.uid()
      AND (om.is_owner = true OR om.role IN ('admin', 'strategist'))
    )
  );

-- RLS Policies for marketing_campaigns
CREATE POLICY "Org members can view campaigns"
  ON public.marketing_campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_campaigns.organization_id
      AND om.user_id = auth.uid()
    )
    OR
    -- Client users can view their campaigns
    EXISTS (
      SELECT 1 FROM public.marketing_clients mc
      JOIN public.client_users cu ON cu.client_id = mc.client_id
      WHERE mc.id = marketing_campaigns.marketing_client_id
      AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Strategists and admins can manage campaigns"
  ON public.marketing_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_campaigns.organization_id
      AND om.user_id = auth.uid()
      AND (om.is_owner = true OR om.role IN ('admin', 'strategist'))
    )
  );

-- RLS Policies for marketing_content_calendar
CREATE POLICY "Org members can view content calendar"
  ON public.marketing_content_calendar FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_content_calendar.organization_id
      AND om.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.marketing_clients mc
      JOIN public.client_users cu ON cu.client_id = mc.client_id
      WHERE mc.id = marketing_content_calendar.marketing_client_id
      AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Strategists and admins can manage content calendar"
  ON public.marketing_content_calendar FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_content_calendar.organization_id
      AND om.user_id = auth.uid()
      AND (om.is_owner = true OR om.role IN ('admin', 'strategist'))
    )
  );

-- RLS Policies for marketing_reports
CREATE POLICY "Org members can view reports"
  ON public.marketing_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_reports.organization_id
      AND om.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.marketing_clients mc
      JOIN public.client_users cu ON cu.client_id = mc.client_id
      WHERE mc.id = marketing_reports.marketing_client_id
      AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Strategists and admins can manage reports"
  ON public.marketing_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_reports.organization_id
      AND om.user_id = auth.uid()
      AND (om.is_owner = true OR om.role IN ('admin', 'strategist'))
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_marketing_clients_updated_at
  BEFORE UPDATE ON public.marketing_clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_marketing_content_calendar_updated_at
  BEFORE UPDATE ON public.marketing_content_calendar
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_marketing_reports_updated_at
  BEFORE UPDATE ON public.marketing_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for performance
CREATE INDEX idx_marketing_clients_org ON public.marketing_clients(organization_id);
CREATE INDEX idx_marketing_clients_client ON public.marketing_clients(client_id);
CREATE INDEX idx_marketing_clients_active ON public.marketing_clients(organization_id, is_active);
CREATE INDEX idx_marketing_campaigns_client ON public.marketing_campaigns(marketing_client_id);
CREATE INDEX idx_marketing_campaigns_status ON public.marketing_campaigns(organization_id, status);
CREATE INDEX idx_marketing_calendar_date ON public.marketing_content_calendar(marketing_client_id, scheduled_date);
CREATE INDEX idx_marketing_reports_client ON public.marketing_reports(marketing_client_id);