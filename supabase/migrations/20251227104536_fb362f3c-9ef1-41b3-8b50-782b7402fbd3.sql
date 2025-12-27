-- =====================================================
-- AMBASSADOR DIFFERENTIAL SYSTEM (Retry after deadlock)
-- =====================================================

-- 1. Ambassador-specific referrals (organization-scoped)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ambassador_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ambassador_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  referred_email TEXT NOT NULL,
  referred_type TEXT NOT NULL DEFAULT 'creator' CHECK (referred_type IN ('creator', 'editor', 'client')),
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'active', 'churned')),
  registered_at TIMESTAMP WITH TIME ZONE,
  activated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, referral_code)
);

-- 2. Ambassador commission configuration per organization
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ambassador_commission_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ambassador_level TEXT NOT NULL CHECK (ambassador_level IN ('bronze', 'silver', 'gold')),
  commission_type TEXT NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed', 'up_points')),
  commission_value NUMERIC NOT NULL DEFAULT 5,
  up_bonus_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  priority_assignment_boost INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, ambassador_level)
);

-- 3. Ambassador network metrics (aggregated stats)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ambassador_network_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ambassador_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  active_referrals_count INTEGER NOT NULL DEFAULT 0,
  content_by_network INTEGER NOT NULL DEFAULT 0,
  revenue_by_network NUMERIC NOT NULL DEFAULT 0,
  commission_earned NUMERIC NOT NULL DEFAULT 0,
  up_bonus_earned INTEGER NOT NULL DEFAULT 0,
  retention_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, ambassador_id, period_month, period_year)
);

-- 4. Ambassador AI recommendations history
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ambassador_ai_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recommended_level TEXT NOT NULL CHECK (recommended_level IN ('none', 'bronze', 'silver', 'gold')),
  current_level TEXT,
  confidence NUMERIC NOT NULL DEFAULT 0,
  justification JSONB NOT NULL DEFAULT '[]',
  risk_flags JSONB NOT NULL DEFAULT '[]',
  suggested_actions JSONB NOT NULL DEFAULT '[]',
  network_metrics JSONB,
  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Add ambassador-specific fields to organization_members
-- =====================================================
ALTER TABLE public.organization_members
ADD COLUMN IF NOT EXISTS ambassador_referral_code TEXT,
ADD COLUMN IF NOT EXISTS ambassador_since TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ambassador_total_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ambassador_active_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ambassador_network_revenue NUMERIC DEFAULT 0;

-- 6. Enable RLS
-- =====================================================
ALTER TABLE public.ambassador_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_commission_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_network_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_ai_evaluations ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for ambassador_referrals
-- =====================================================
CREATE POLICY "amb_ref_view_own"
  ON public.ambassador_referrals
  FOR SELECT
  USING (ambassador_id = auth.uid());

CREATE POLICY "amb_ref_admin_view"
  ON public.ambassador_referrals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = ambassador_referrals.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

CREATE POLICY "amb_ref_create"
  ON public.ambassador_referrals
  FOR INSERT
  WITH CHECK (
    ambassador_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = ambassador_referrals.organization_id
      AND om.user_id = auth.uid()
      AND om.ambassador_level IN ('bronze', 'silver', 'gold')
    )
  );

-- 8. RLS Policies for ambassador_commission_config
-- =====================================================
CREATE POLICY "amb_comm_admin"
  ON public.ambassador_commission_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = ambassador_commission_config.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

CREATE POLICY "amb_comm_view"
  ON public.ambassador_commission_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = ambassador_commission_config.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- 9. RLS Policies for ambassador_network_stats
-- =====================================================
CREATE POLICY "amb_stats_own"
  ON public.ambassador_network_stats
  FOR SELECT
  USING (ambassador_id = auth.uid());

CREATE POLICY "amb_stats_admin"
  ON public.ambassador_network_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = ambassador_network_stats.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- 10. RLS Policies for ambassador_ai_evaluations
-- =====================================================
CREATE POLICY "amb_ai_admin"
  ON public.ambassador_ai_evaluations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = ambassador_ai_evaluations.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- 11. Function to generate ambassador referral code
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_ambassador_referral_code(org_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
  user_name TEXT;
BEGIN
  SELECT COALESCE(UPPER(SUBSTRING(full_name FROM 1 FOR 4)), 'AMB') INTO user_name
  FROM public.profiles WHERE id = p_user_id;
  
  LOOP
    new_code := user_name || '-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 4));
    SELECT EXISTS(
      SELECT 1 FROM public.ambassador_referrals 
      WHERE organization_id = org_id AND referral_code = new_code
    ) INTO code_exists;
    
    IF NOT code_exists THEN
      UPDATE public.organization_members
      SET ambassador_referral_code = new_code
      WHERE organization_id = org_id AND user_id = p_user_id;
      
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$;

-- 12. Function to update ambassador stats when referral becomes active
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_ambassador_stats_on_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.organization_members
    SET ambassador_total_referrals = COALESCE(ambassador_total_referrals, 0) + 1
    WHERE organization_id = NEW.organization_id AND user_id = NEW.ambassador_id;
  END IF;
  
  IF TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status != 'active' THEN
    UPDATE public.organization_members
    SET ambassador_active_referrals = COALESCE(ambassador_active_referrals, 0) + 1,
        updated_at = now()
    WHERE organization_id = NEW.organization_id AND user_id = NEW.ambassador_id;
  END IF;
  
  IF TG_OP = 'UPDATE' AND NEW.status = 'churned' AND OLD.status = 'active' THEN
    UPDATE public.organization_members
    SET ambassador_active_referrals = GREATEST(0, COALESCE(ambassador_active_referrals, 0) - 1),
        updated_at = now()
    WHERE organization_id = NEW.organization_id AND user_id = NEW.ambassador_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_ambassador_stats ON public.ambassador_referrals;
CREATE TRIGGER trigger_update_ambassador_stats
  AFTER INSERT OR UPDATE ON public.ambassador_referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ambassador_stats_on_referral();

-- 13. Indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_amb_ref_org ON public.ambassador_referrals(organization_id);
CREATE INDEX IF NOT EXISTS idx_amb_ref_amb ON public.ambassador_referrals(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_amb_ref_code ON public.ambassador_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_amb_ref_status ON public.ambassador_referrals(status);
CREATE INDEX IF NOT EXISTS idx_amb_stats_amb ON public.ambassador_network_stats(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_amb_ai_user ON public.ambassador_ai_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_org_amb_code ON public.organization_members(ambassador_referral_code) WHERE ambassador_referral_code IS NOT NULL;