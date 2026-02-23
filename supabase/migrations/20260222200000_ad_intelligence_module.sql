-- ============================================================
-- Ad Intelligence Module
-- Multi-platform ad library intelligence (Meta, TikTok, Google)
-- ============================================================

-- ── Saved Searches ──────────────────────────────────────────

CREATE TABLE ad_library_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'meta',
  search_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sync_interval_hours INT DEFAULT 24,
  last_synced_at TIMESTAMPTZ,
  total_ads_found INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Ads Found ───────────────────────────────────────────────

CREATE TABLE ad_library_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES ad_library_searches(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'meta',
  platform_ad_id TEXT NOT NULL,
  page_id TEXT,
  page_name TEXT,
  ad_creative_bodies TEXT[],
  ad_creative_link_titles TEXT[],
  ad_creative_link_descriptions TEXT[],
  ad_snapshot_url TEXT,
  publisher_platforms TEXT[],
  languages TEXT[],
  media_type TEXT,
  ad_delivery_start TEXT,
  ad_delivery_stop TEXT,
  is_active BOOLEAN DEFAULT true,
  spend_lower INT,
  spend_upper INT,
  impressions_lower INT,
  impressions_upper INT,
  currency TEXT,
  raw_data JSONB DEFAULT '{}',
  ai_analysis JSONB,
  ai_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, platform_ad_id)
);

-- ── Collections ─────────────────────────────────────────────

CREATE TABLE ad_library_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ad_library_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES ad_library_collections(id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES ad_library_ads(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, ad_id)
);

-- ── Indexes ─────────────────────────────────────────────────

CREATE INDEX idx_ad_library_ads_search_id ON ad_library_ads(search_id);
CREATE INDEX idx_ad_library_ads_page_name ON ad_library_ads(page_name);
CREATE INDEX idx_ad_library_ads_platform_ad_id ON ad_library_ads(platform, platform_ad_id);
CREATE INDEX idx_ad_library_ads_is_active ON ad_library_ads(is_active);
CREATE INDEX idx_ad_library_ads_platform ON ad_library_ads(platform);
CREATE INDEX idx_ad_library_ads_created_at ON ad_library_ads(created_at DESC);
CREATE INDEX idx_ad_library_collection_items_collection ON ad_library_collection_items(collection_id);
CREATE INDEX idx_ad_library_collection_items_ad ON ad_library_collection_items(ad_id);
CREATE INDEX idx_ad_library_searches_created_by ON ad_library_searches(created_by);

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE ad_library_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_library_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_library_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_library_collection_items ENABLE ROW LEVEL SECURITY;

-- ad_library_searches
CREATE POLICY "ad_library_searches_select" ON ad_library_searches
  FOR SELECT TO authenticated
  USING (is_platform_root(auth.uid()));

CREATE POLICY "ad_library_searches_insert" ON ad_library_searches
  FOR INSERT TO authenticated
  WITH CHECK (is_platform_root(auth.uid()));

CREATE POLICY "ad_library_searches_update" ON ad_library_searches
  FOR UPDATE TO authenticated
  USING (is_platform_root(auth.uid()));

CREATE POLICY "ad_library_searches_delete" ON ad_library_searches
  FOR DELETE TO authenticated
  USING (is_platform_root(auth.uid()));

-- ad_library_ads
CREATE POLICY "ad_library_ads_select" ON ad_library_ads
  FOR SELECT TO authenticated
  USING (is_platform_root(auth.uid()));

CREATE POLICY "ad_library_ads_insert" ON ad_library_ads
  FOR INSERT TO authenticated
  WITH CHECK (is_platform_root(auth.uid()));

CREATE POLICY "ad_library_ads_update" ON ad_library_ads
  FOR UPDATE TO authenticated
  USING (is_platform_root(auth.uid()));

CREATE POLICY "ad_library_ads_delete" ON ad_library_ads
  FOR DELETE TO authenticated
  USING (is_platform_root(auth.uid()));

-- ad_library_collections
CREATE POLICY "ad_library_collections_select" ON ad_library_collections
  FOR SELECT TO authenticated
  USING (is_platform_root(auth.uid()));

CREATE POLICY "ad_library_collections_insert" ON ad_library_collections
  FOR INSERT TO authenticated
  WITH CHECK (is_platform_root(auth.uid()));

CREATE POLICY "ad_library_collections_update" ON ad_library_collections
  FOR UPDATE TO authenticated
  USING (is_platform_root(auth.uid()));

CREATE POLICY "ad_library_collections_delete" ON ad_library_collections
  FOR DELETE TO authenticated
  USING (is_platform_root(auth.uid()));

-- ad_library_collection_items
CREATE POLICY "ad_library_collection_items_select" ON ad_library_collection_items
  FOR SELECT TO authenticated
  USING (is_platform_root(auth.uid()));

CREATE POLICY "ad_library_collection_items_insert" ON ad_library_collection_items
  FOR INSERT TO authenticated
  WITH CHECK (is_platform_root(auth.uid()));

CREATE POLICY "ad_library_collection_items_update" ON ad_library_collection_items
  FOR UPDATE TO authenticated
  USING (is_platform_root(auth.uid()));

CREATE POLICY "ad_library_collection_items_delete" ON ad_library_collection_items
  FOR DELETE TO authenticated
  USING (is_platform_root(auth.uid()));

-- ── Grants ──────────────────────────────────────────────────

GRANT ALL ON ad_library_searches TO authenticated;
GRANT ALL ON ad_library_searches TO service_role;
GRANT ALL ON ad_library_ads TO authenticated;
GRANT ALL ON ad_library_ads TO service_role;
GRANT ALL ON ad_library_collections TO authenticated;
GRANT ALL ON ad_library_collections TO service_role;
GRANT ALL ON ad_library_collection_items TO authenticated;
GRANT ALL ON ad_library_collection_items TO service_role;

NOTIFY pgrst, 'reload schema';
