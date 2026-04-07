-- Parte 2: Tablas de temporadas con premios

CREATE TABLE IF NOT EXISTS public.season_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.reputation_seasons(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('points_bonus', 'badge', 'monetary', 'custom')),
  position_type TEXT NOT NULL CHECK (position_type IN ('rank', 'percentile', 'threshold')),
  position_min INTEGER NOT NULL,
  position_max INTEGER,
  role_key TEXT,
  points_amount INTEGER DEFAULT 0,
  badge_id UUID REFERENCES public.achievements(id) ON DELETE SET NULL,
  monetary_amount DECIMAL(10,2) DEFAULT 0,
  monetary_currency TEXT DEFAULT 'USD',
  custom_data JSONB DEFAULT '{}',
  display_name TEXT NOT NULL,
  display_icon TEXT DEFAULT 'trophy',
  display_color TEXT DEFAULT '#FFD700',
  description TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_season_rewards_season ON public.season_rewards(season_id, is_active);
CREATE INDEX IF NOT EXISTS idx_season_rewards_org ON public.season_rewards(organization_id);

ALTER TABLE public.season_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view rewards" ON public.season_rewards FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = season_rewards.organization_id AND om.user_id = auth.uid()));

CREATE POLICY "Admins can manage rewards" ON public.season_rewards FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = season_rewards.organization_id AND om.user_id = auth.uid() AND om.is_owner = true));


CREATE TABLE IF NOT EXISTS public.season_reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.reputation_seasons(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.season_rewards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  final_rank INTEGER NOT NULL,
  final_points INTEGER NOT NULL,
  final_level TEXT,
  role_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'delivered', 'expired', 'cancelled')),
  claimed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  delivered_by UUID REFERENCES auth.users(id),
  delivery_notes TEXT,
  payment_reference TEXT,
  payment_method TEXT,
  claim_data JSONB DEFAULT '{}',
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(season_id, reward_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reward_claims_user ON public.season_reward_claims(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reward_claims_season ON public.season_reward_claims(season_id, status);

ALTER TABLE public.season_reward_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims" ON public.season_reward_claims FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Org members can view org claims" ON public.season_reward_claims FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = season_reward_claims.organization_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can manage claims" ON public.season_reward_claims FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = season_reward_claims.organization_id AND om.user_id = auth.uid() AND om.is_owner = true));
