-- =============================================
-- KREOON MARKETING MODULE - Ads Management System
-- Manage Meta, TikTok, and Google ads directly from the platform
-- =============================================
-- NOTE: The old marketing_campaigns, marketing_reports, and marketing_ai_insights
-- tables from migration 20260102174449 are renamed to *_legacy so this module
-- can use the standard marketing_* naming that all frontend code expects.
-- =============================================

-- Rename legacy tables to avoid conflicts
ALTER TABLE IF EXISTS public.marketing_campaigns RENAME TO marketing_campaigns_legacy;
ALTER TABLE IF EXISTS public.marketing_reports RENAME TO marketing_reports_legacy;
ALTER TABLE IF EXISTS public.marketing_ai_insights RENAME TO marketing_ai_insights_legacy;

-- =============================================
-- 1. ENUM TYPES (idempotent)
-- =============================================

DO $$ BEGIN
  CREATE TYPE ad_platform AS ENUM ('meta', 'tiktok', 'google');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ad_account_status AS ENUM ('active', 'paused', 'disabled', 'pending_review');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ad_campaign_status AS ENUM ('draft', 'pending_review', 'active', 'paused', 'completed', 'rejected', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ad_objective AS ENUM ('awareness', 'traffic', 'engagement', 'leads', 'sales', 'app_installs', 'video_views', 'reach', 'conversions');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- 2. TABLES
-- =============================================

-- -----------------------------------------------
-- 2a. marketing_ad_accounts - Connected ad platform accounts
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  platform ad_platform NOT NULL,
  platform_account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_status ad_account_status DEFAULT 'active',
  currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'America/Bogota',
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  platform_metadata JSONB DEFAULT '{}'::jsonb,
  daily_budget_limit NUMERIC(12,2),
  monthly_spend NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, platform, platform_account_id)
);

-- -----------------------------------------------
-- 2b. marketing_campaigns - Ad campaigns (legacy table renamed to marketing_campaigns_legacy)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ad_account_id UUID NOT NULL REFERENCES public.marketing_ad_accounts(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
  platform ad_platform NOT NULL,
  platform_campaign_id TEXT,
  name TEXT NOT NULL,
  objective ad_objective NOT NULL,
  status ad_campaign_status DEFAULT 'draft',
  daily_budget NUMERIC(12,2),
  lifetime_budget NUMERIC(12,2),
  currency TEXT DEFAULT 'USD',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  targeting JSONB DEFAULT '{}'::jsonb,
  placements JSONB DEFAULT '[]'::jsonb,
  creative JSONB DEFAULT '{}'::jsonb,
  ai_suggestions JSONB DEFAULT '{}'::jsonb,
  ai_generated BOOLEAN DEFAULT false,
  performance_goal TEXT,
  bid_strategy TEXT DEFAULT 'lowest_cost',
  bid_amount NUMERIC(12,2),
  platform_metadata JSONB DEFAULT '{}'::jsonb,
  total_spend NUMERIC(12,2) DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------
-- 2c. marketing_ad_sets - Ad sets / Ad groups
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_ad_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  platform_ad_set_id TEXT,
  name TEXT NOT NULL,
  status ad_campaign_status DEFAULT 'draft',
  daily_budget NUMERIC(12,2),
  targeting JSONB DEFAULT '{}'::jsonb,
  placements JSONB DEFAULT '[]'::jsonb,
  bid_strategy TEXT,
  bid_amount NUMERIC(12,2),
  optimization_goal TEXT,
  platform_metadata JSONB DEFAULT '{}'::jsonb,
  total_spend NUMERIC(12,2) DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------
-- 2d. marketing_ads - Individual ads
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_set_id UUID NOT NULL REFERENCES public.marketing_ad_sets(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
  platform_ad_id TEXT,
  name TEXT NOT NULL,
  status ad_campaign_status DEFAULT 'draft',
  creative JSONB DEFAULT '{}'::jsonb,
  destination_url TEXT,
  tracking_url TEXT,
  utm_params JSONB DEFAULT '{}'::jsonb,
  platform_metadata JSONB DEFAULT '{}'::jsonb,
  total_spend NUMERIC(12,2) DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------
-- 2e. marketing_metrics - Time-series performance metrics
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  ad_set_id UUID REFERENCES public.marketing_ad_sets(id) ON DELETE SET NULL,
  ad_id UUID REFERENCES public.marketing_ads(id) ON DELETE SET NULL,
  platform ad_platform NOT NULL,
  date DATE NOT NULL,
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  ctr NUMERIC(8,4) DEFAULT 0,
  cpc NUMERIC(12,4) DEFAULT 0,
  cpm NUMERIC(12,4) DEFAULT 0,
  spend NUMERIC(12,2) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_value NUMERIC(12,2) DEFAULT 0,
  roas NUMERIC(8,4) DEFAULT 0,
  video_views BIGINT DEFAULT 0,
  video_views_25 BIGINT DEFAULT 0,
  video_views_50 BIGINT DEFAULT 0,
  video_views_75 BIGINT DEFAULT 0,
  video_views_100 BIGINT DEFAULT 0,
  engagement BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  saves BIGINT DEFAULT 0,
  leads INTEGER DEFAULT 0,
  cost_per_lead NUMERIC(12,4) DEFAULT 0,
  cost_per_conversion NUMERIC(12,4) DEFAULT 0,
  frequency NUMERIC(8,2) DEFAULT 0,
  platform_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, ad_set_id, ad_id, date)
);

-- -----------------------------------------------
-- 2f. marketing_reports - Saved/generated reports (legacy table renamed to marketing_reports_legacy)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'campaign',
  config JSONB DEFAULT '{}'::jsonb,
  data_snapshot JSONB,
  file_url TEXT,
  is_scheduled BOOLEAN DEFAULT false,
  schedule_cron TEXT,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------
-- 2g. marketing_ai_insights - AI optimization insights (legacy table renamed to marketing_ai_insights_legacy)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  suggested_action JSONB,
  is_read BOOLEAN DEFAULT false,
  is_applied BOOLEAN DEFAULT false,
  platform_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 3. INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_marketing_ad_accounts_org
  ON public.marketing_ad_accounts(organization_id);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_org_status
  ON public.marketing_campaigns(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_ad_account
  ON public.marketing_campaigns(ad_account_id);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_content
  ON public.marketing_campaigns(content_id)
  WHERE content_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_ad_sets_campaign
  ON public.marketing_ad_sets(campaign_id);

CREATE INDEX IF NOT EXISTS idx_marketing_ads_ad_set
  ON public.marketing_ads(ad_set_id);

CREATE INDEX IF NOT EXISTS idx_marketing_ads_campaign
  ON public.marketing_ads(campaign_id);

CREATE INDEX IF NOT EXISTS idx_marketing_ads_content
  ON public.marketing_ads(content_id)
  WHERE content_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_metrics_campaign_date
  ON public.marketing_metrics(campaign_id, date);

CREATE INDEX IF NOT EXISTS idx_marketing_metrics_org_date
  ON public.marketing_metrics(organization_id, date);

CREATE INDEX IF NOT EXISTS idx_marketing_metrics_ad_date
  ON public.marketing_metrics(ad_id, date)
  WHERE ad_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_reports_org
  ON public.marketing_reports(organization_id);

CREATE INDEX IF NOT EXISTS idx_marketing_ai_insights_org_read
  ON public.marketing_ai_insights(organization_id, is_read);

CREATE INDEX IF NOT EXISTS idx_marketing_ai_insights_campaign
  ON public.marketing_ai_insights(campaign_id);

-- =============================================
-- 4. ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.marketing_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_ai_insights ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------
-- 4a. marketing_ad_accounts policies
-- -----------------------------------------------
CREATE POLICY "ad_accounts_select_org_member"
  ON public.marketing_ad_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_ad_accounts.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "ad_accounts_insert_org_member"
  ON public.marketing_ad_accounts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_ad_accounts.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "ad_accounts_update_org_member"
  ON public.marketing_ad_accounts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_ad_accounts.organization_id
        AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_ad_accounts.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "ad_accounts_delete_org_member"
  ON public.marketing_ad_accounts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_ad_accounts.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- -----------------------------------------------
-- 4b. marketing_campaigns policies
-- -----------------------------------------------
CREATE POLICY "marketing_campaigns_select_org_member"
  ON public.marketing_campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_campaigns.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "marketing_campaigns_insert_org_member"
  ON public.marketing_campaigns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_campaigns.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "marketing_campaigns_update_org_member"
  ON public.marketing_campaigns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_campaigns.organization_id
        AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_campaigns.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "marketing_campaigns_delete_org_member"
  ON public.marketing_campaigns FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_campaigns.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- -----------------------------------------------
-- 4c. marketing_ad_sets policies
-- Ad sets inherit org access through their parent campaign
-- -----------------------------------------------
CREATE POLICY "ad_sets_select_org_member"
  ON public.marketing_ad_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.marketing_campaigns ac
      INNER JOIN public.organization_members om
        ON om.organization_id = ac.organization_id
       AND om.user_id = auth.uid()
      WHERE ac.id = marketing_ad_sets.campaign_id
    )
  );

CREATE POLICY "ad_sets_insert_org_member"
  ON public.marketing_ad_sets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marketing_campaigns ac
      INNER JOIN public.organization_members om
        ON om.organization_id = ac.organization_id
       AND om.user_id = auth.uid()
      WHERE ac.id = marketing_ad_sets.campaign_id
    )
  );

CREATE POLICY "ad_sets_update_org_member"
  ON public.marketing_ad_sets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.marketing_campaigns ac
      INNER JOIN public.organization_members om
        ON om.organization_id = ac.organization_id
       AND om.user_id = auth.uid()
      WHERE ac.id = marketing_ad_sets.campaign_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marketing_campaigns ac
      INNER JOIN public.organization_members om
        ON om.organization_id = ac.organization_id
       AND om.user_id = auth.uid()
      WHERE ac.id = marketing_ad_sets.campaign_id
    )
  );

CREATE POLICY "ad_sets_delete_org_member"
  ON public.marketing_ad_sets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.marketing_campaigns ac
      INNER JOIN public.organization_members om
        ON om.organization_id = ac.organization_id
       AND om.user_id = auth.uid()
      WHERE ac.id = marketing_ad_sets.campaign_id
    )
  );

-- -----------------------------------------------
-- 4d. marketing_ads policies
-- Ads inherit org access through their parent campaign
-- -----------------------------------------------
CREATE POLICY "ads_select_org_member"
  ON public.marketing_ads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.marketing_campaigns ac
      INNER JOIN public.organization_members om
        ON om.organization_id = ac.organization_id
       AND om.user_id = auth.uid()
      WHERE ac.id = marketing_ads.campaign_id
    )
  );

CREATE POLICY "ads_insert_org_member"
  ON public.marketing_ads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marketing_campaigns ac
      INNER JOIN public.organization_members om
        ON om.organization_id = ac.organization_id
       AND om.user_id = auth.uid()
      WHERE ac.id = marketing_ads.campaign_id
    )
  );

CREATE POLICY "ads_update_org_member"
  ON public.marketing_ads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.marketing_campaigns ac
      INNER JOIN public.organization_members om
        ON om.organization_id = ac.organization_id
       AND om.user_id = auth.uid()
      WHERE ac.id = marketing_ads.campaign_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marketing_campaigns ac
      INNER JOIN public.organization_members om
        ON om.organization_id = ac.organization_id
       AND om.user_id = auth.uid()
      WHERE ac.id = marketing_ads.campaign_id
    )
  );

CREATE POLICY "ads_delete_org_member"
  ON public.marketing_ads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.marketing_campaigns ac
      INNER JOIN public.organization_members om
        ON om.organization_id = ac.organization_id
       AND om.user_id = auth.uid()
      WHERE ac.id = marketing_ads.campaign_id
    )
  );

-- -----------------------------------------------
-- 4e. marketing_metrics policies
-- -----------------------------------------------
CREATE POLICY "metrics_select_org_member"
  ON public.marketing_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_metrics.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "metrics_insert_org_member"
  ON public.marketing_metrics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_metrics.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "metrics_update_org_member"
  ON public.marketing_metrics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_metrics.organization_id
        AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_metrics.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "metrics_delete_org_member"
  ON public.marketing_metrics FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_metrics.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- -----------------------------------------------
-- 4f. marketing_reports policies
-- -----------------------------------------------
CREATE POLICY "marketing_reports_select_org_member"
  ON public.marketing_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_reports.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "marketing_reports_insert_org_member"
  ON public.marketing_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_reports.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "marketing_reports_update_org_member"
  ON public.marketing_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_reports.organization_id
        AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_reports.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "marketing_reports_delete_org_member"
  ON public.marketing_reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_reports.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- -----------------------------------------------
-- 4g. marketing_ai_insights policies
-- -----------------------------------------------
CREATE POLICY "marketing_ai_insights_select_org_member"
  ON public.marketing_ai_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_ai_insights.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "marketing_ai_insights_insert_org_member"
  ON public.marketing_ai_insights FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_ai_insights.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "marketing_ai_insights_update_org_member"
  ON public.marketing_ai_insights FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_ai_insights.organization_id
        AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_ai_insights.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "marketing_ai_insights_delete_org_member"
  ON public.marketing_ai_insights FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = marketing_ai_insights.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- =============================================
-- 5. GRANTS
-- =============================================

GRANT ALL ON public.marketing_ad_accounts TO authenticated;
GRANT ALL ON public.marketing_ad_accounts TO service_role;

GRANT ALL ON public.marketing_campaigns TO authenticated;
GRANT ALL ON public.marketing_campaigns TO service_role;

GRANT ALL ON public.marketing_ad_sets TO authenticated;
GRANT ALL ON public.marketing_ad_sets TO service_role;

GRANT ALL ON public.marketing_ads TO authenticated;
GRANT ALL ON public.marketing_ads TO service_role;

GRANT ALL ON public.marketing_metrics TO authenticated;
GRANT ALL ON public.marketing_metrics TO service_role;

GRANT ALL ON public.marketing_reports TO authenticated;
GRANT ALL ON public.marketing_reports TO service_role;

GRANT ALL ON public.marketing_ai_insights TO authenticated;
GRANT ALL ON public.marketing_ai_insights TO service_role;

-- =============================================
-- 6. UPDATED_AT TRIGGERS
-- =============================================

CREATE TRIGGER update_marketing_ad_accounts_updated_at
  BEFORE UPDATE ON public.marketing_ad_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_marketing_ad_sets_updated_at
  BEFORE UPDATE ON public.marketing_ad_sets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_marketing_ads_updated_at
  BEFORE UPDATE ON public.marketing_ads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_marketing_reports_updated_at
  BEFORE UPDATE ON public.marketing_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 7. RPC: get_marketing_dashboard_metrics
-- =============================================

CREATE OR REPLACE FUNCTION public.get_marketing_dashboard_metrics(
  p_org_id UUID,
  p_from DATE,
  p_to DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_totals JSONB;
  v_per_platform JSONB;
  v_daily JSONB;
  v_top_campaigns JSONB;
BEGIN
  -- -----------------------------------------------
  -- Totals
  -- -----------------------------------------------
  SELECT jsonb_build_object(
    'total_spend', COALESCE(SUM(m.spend), 0),
    'total_impressions', COALESCE(SUM(m.impressions), 0),
    'total_clicks', COALESCE(SUM(m.clicks), 0),
    'total_conversions', COALESCE(SUM(m.conversions), 0),
    'avg_ctr', CASE
      WHEN COALESCE(SUM(m.impressions), 0) = 0 THEN 0
      ELSE ROUND((SUM(m.clicks)::NUMERIC / SUM(m.impressions)::NUMERIC) * 100, 4)
    END,
    'avg_cpc', CASE
      WHEN COALESCE(SUM(m.clicks), 0) = 0 THEN 0
      ELSE ROUND(SUM(m.spend) / SUM(m.clicks)::NUMERIC, 4)
    END,
    'avg_roas', CASE
      WHEN COALESCE(SUM(m.spend), 0) = 0 THEN 0
      ELSE ROUND(SUM(m.conversion_value) / SUM(m.spend), 4)
    END
  ) INTO v_totals
  FROM public.marketing_metrics m
  WHERE m.organization_id = p_org_id
    AND m.date >= p_from
    AND m.date <= p_to;

  -- -----------------------------------------------
  -- Per-platform breakdown
  -- -----------------------------------------------
  SELECT COALESCE(jsonb_agg(platform_row), '[]'::jsonb)
  INTO v_per_platform
  FROM (
    SELECT jsonb_build_object(
      'platform', m.platform::TEXT,
      'spend', COALESCE(SUM(m.spend), 0),
      'impressions', COALESCE(SUM(m.impressions), 0),
      'clicks', COALESCE(SUM(m.clicks), 0),
      'conversions', COALESCE(SUM(m.conversions), 0),
      'ctr', CASE
        WHEN COALESCE(SUM(m.impressions), 0) = 0 THEN 0
        ELSE ROUND((SUM(m.clicks)::NUMERIC / SUM(m.impressions)::NUMERIC) * 100, 4)
      END,
      'cpc', CASE
        WHEN COALESCE(SUM(m.clicks), 0) = 0 THEN 0
        ELSE ROUND(SUM(m.spend) / SUM(m.clicks)::NUMERIC, 4)
      END,
      'roas', CASE
        WHEN COALESCE(SUM(m.spend), 0) = 0 THEN 0
        ELSE ROUND(SUM(m.conversion_value) / SUM(m.spend), 4)
      END
    ) AS platform_row
    FROM public.marketing_metrics m
    WHERE m.organization_id = p_org_id
      AND m.date >= p_from
      AND m.date <= p_to
    GROUP BY m.platform
  ) sub;

  -- -----------------------------------------------
  -- Daily time series
  -- -----------------------------------------------
  SELECT COALESCE(jsonb_agg(daily_row ORDER BY d), '[]'::jsonb)
  INTO v_daily
  FROM (
    SELECT jsonb_build_object(
      'date', m.date::TEXT,
      'spend', COALESCE(SUM(m.spend), 0),
      'impressions', COALESCE(SUM(m.impressions), 0),
      'clicks', COALESCE(SUM(m.clicks), 0),
      'conversions', COALESCE(SUM(m.conversions), 0)
    ) AS daily_row,
    m.date AS d
    FROM public.marketing_metrics m
    WHERE m.organization_id = p_org_id
      AND m.date >= p_from
      AND m.date <= p_to
    GROUP BY m.date
  ) sub;

  -- -----------------------------------------------
  -- Top 5 campaigns by spend
  -- -----------------------------------------------
  SELECT COALESCE(jsonb_agg(camp_row), '[]'::jsonb)
  INTO v_top_campaigns
  FROM (
    SELECT jsonb_build_object(
      'campaign_id', ac.id,
      'name', ac.name,
      'platform', ac.platform::TEXT,
      'status', ac.status::TEXT,
      'objective', ac.objective::TEXT,
      'spend', COALESCE(SUM(m.spend), 0),
      'impressions', COALESCE(SUM(m.impressions), 0),
      'clicks', COALESCE(SUM(m.clicks), 0),
      'conversions', COALESCE(SUM(m.conversions), 0),
      'roas', CASE
        WHEN COALESCE(SUM(m.spend), 0) = 0 THEN 0
        ELSE ROUND(SUM(m.conversion_value) / SUM(m.spend), 4)
      END
    ) AS camp_row
    FROM public.marketing_campaigns ac
    LEFT JOIN public.marketing_metrics m
      ON m.campaign_id = ac.id
     AND m.date >= p_from
     AND m.date <= p_to
    WHERE ac.organization_id = p_org_id
    GROUP BY ac.id, ac.name, ac.platform, ac.status, ac.objective
    ORDER BY COALESCE(SUM(m.spend), 0) DESC
    LIMIT 5
  ) sub;

  -- -----------------------------------------------
  -- Assemble result
  -- -----------------------------------------------
  v_result := v_totals || jsonb_build_object(
    'per_platform', v_per_platform,
    'daily', v_daily,
    'top_campaigns', v_top_campaigns
  );

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_marketing_dashboard_metrics(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_marketing_dashboard_metrics(UUID, DATE, DATE) TO service_role;
