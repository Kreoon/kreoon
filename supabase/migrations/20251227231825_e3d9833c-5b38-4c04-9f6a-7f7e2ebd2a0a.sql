-- =============================================
-- PORTFOLIO MODULE: Complete Database Schema
-- =============================================

-- 1. Profile Blocks Configuration (per organization)
CREATE TABLE public.profile_blocks_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_type TEXT NOT NULL DEFAULT 'user', -- 'user' | 'company'
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, profile_type)
);

-- 2. Profile AI Configuration (per organization)
CREATE TABLE public.profile_ai_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  provider TEXT NOT NULL DEFAULT 'lovable', -- 'lovable' | 'openai' | 'gemini'
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  features JSONB NOT NULL DEFAULT '{
    "ai_search": false,
    "ai_feed_ranking": false,
    "ai_caption_helper": true,
    "ai_bio_helper": true,
    "ai_moderation": false,
    "ai_insights": false,
    "ai_recommendations": false
  }'::jsonb,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Saved Collections (folders for saved items)
CREATE TABLE public.saved_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  cover_url TEXT,
  is_private BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Saved Items (bookmarks)
CREATE TABLE public.saved_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL, -- 'work_video' | 'post' | 'profile' | 'company'
  item_id UUID NOT NULL,
  collection_id UUID REFERENCES public.saved_collections(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

-- 5. Portfolio Moderation Flags
CREATE TABLE public.portfolio_moderation_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- 'post' | 'story' | 'video' | 'comment'
  item_id UUID NOT NULL,
  user_id UUID NOT NULL, -- who created the content
  severity TEXT NOT NULL DEFAULT 'low', -- 'low' | 'medium' | 'high' | 'critical'
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_confidence NUMERIC(3,2),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'removed'
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Portfolio Permissions (RBAC per organization)
CREATE TABLE public.portfolio_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{
    "portfolio.feed.view": true,
    "portfolio.videos.view": true,
    "portfolio.profile.view": true,
    "portfolio.profile.edit": false,
    "portfolio.saved.view": true,
    "portfolio.posts.create": false,
    "portfolio.stories.create": false,
    "portfolio.internal.view": false,
    "portfolio.ai.use": false
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.profile_blocks_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_moderation_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_permissions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Profile Blocks Config: Org members can view, org admins can manage
CREATE POLICY "Org members can view blocks config"
ON public.profile_blocks_config FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage blocks config"
ON public.profile_blocks_config FOR ALL
USING (is_org_owner(auth.uid(), organization_id));

-- Profile AI Config: Same pattern
CREATE POLICY "Org members can view AI config"
ON public.profile_ai_config FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage AI config"
ON public.profile_ai_config FOR ALL
USING (is_org_owner(auth.uid(), organization_id));

-- Saved Collections: Only owner
CREATE POLICY "Users can view own collections"
ON public.saved_collections FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage own collections"
ON public.saved_collections FOR ALL
USING (user_id = auth.uid());

-- Saved Items: Only owner
CREATE POLICY "Users can view own saved items"
ON public.saved_items FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage own saved items"
ON public.saved_items FOR ALL
USING (user_id = auth.uid());

-- Portfolio Moderation Flags: Org admins can view/manage
CREATE POLICY "Org admins can view moderation flags"
ON public.portfolio_moderation_flags FOR SELECT
USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert moderation flags"
ON public.portfolio_moderation_flags FOR INSERT
WITH CHECK (true);

CREATE POLICY "Org admins can update moderation flags"
ON public.portfolio_moderation_flags FOR UPDATE
USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Portfolio Permissions: Org members can view, org admins can manage
CREATE POLICY "Org members can view permissions"
ON public.portfolio_permissions FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage permissions"
ON public.portfolio_permissions FOR ALL
USING (is_org_owner(auth.uid(), organization_id));

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_profile_blocks_config_org ON public.profile_blocks_config(organization_id);
CREATE INDEX idx_profile_ai_config_org ON public.profile_ai_config(organization_id);
CREATE INDEX idx_saved_collections_user ON public.saved_collections(user_id);
CREATE INDEX idx_saved_items_user ON public.saved_items(user_id);
CREATE INDEX idx_saved_items_collection ON public.saved_items(collection_id);
CREATE INDEX idx_saved_items_item ON public.saved_items(item_type, item_id);
CREATE INDEX idx_portfolio_moderation_flags_item ON public.portfolio_moderation_flags(item_type, item_id);
CREATE INDEX idx_portfolio_moderation_flags_status ON public.portfolio_moderation_flags(status);
CREATE INDEX idx_portfolio_permissions_org ON public.portfolio_permissions(organization_id);

-- =============================================
-- DEFAULT BLOCKS CONFIGURATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.get_default_profile_blocks()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN '[
    {"key": "hero", "label": "Hero", "enabled": true, "order": 0, "visibility": "public", "is_internal": false},
    {"key": "highlights", "label": "Highlights", "enabled": true, "order": 1, "visibility": "public", "is_internal": false},
    {"key": "portfolio_grid", "label": "Portfolio", "enabled": true, "order": 2, "visibility": "public", "is_internal": false},
    {"key": "skills", "label": "Skills", "enabled": true, "order": 3, "visibility": "public", "is_internal": false},
    {"key": "certifications", "label": "Certifications", "enabled": true, "order": 4, "visibility": "public", "is_internal": false},
    {"key": "testimonials", "label": "Testimonials", "enabled": true, "order": 5, "visibility": "public", "is_internal": false},
    {"key": "public_stats", "label": "Stats", "enabled": true, "order": 6, "visibility": "public", "is_internal": false},
    {"key": "collections", "label": "Collections", "enabled": true, "order": 7, "visibility": "public", "is_internal": false},
    {"key": "internal_verification", "label": "Verification", "enabled": true, "order": 100, "visibility": "org_admin", "is_internal": true},
    {"key": "private_contact", "label": "Private Contact", "enabled": true, "order": 101, "visibility": "org_admin", "is_internal": true},
    {"key": "legal_id", "label": "Legal ID", "enabled": true, "order": 102, "visibility": "org_admin", "is_internal": true},
    {"key": "payment_info", "label": "Payment Info", "enabled": true, "order": 103, "visibility": "org_admin", "is_internal": true},
    {"key": "internal_notes", "label": "Internal Notes", "enabled": true, "order": 104, "visibility": "org_admin", "is_internal": true},
    {"key": "internal_metrics", "label": "Internal Metrics", "enabled": true, "order": 105, "visibility": "org_admin", "is_internal": true}
  ]'::jsonb;
END;
$$;