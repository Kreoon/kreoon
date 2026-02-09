-- =====================================================
-- BRANDS SYSTEM: Independent brand entities for marketplace clients
-- Separate from organizations (internal teams) and company_profiles (AI matching)
-- =====================================================

-- 1. brands table
CREATE TABLE IF NOT EXISTS brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  description TEXT,
  website TEXT,
  industry TEXT,
  country TEXT DEFAULT 'CO',
  city TEXT,
  nit TEXT,
  plan TEXT DEFAULT 'free',
  is_verified BOOLEAN DEFAULT false,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  invite_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. brand_members table
CREATE TABLE IF NOT EXISTS brand_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brand_id, user_id)
);

-- 3. Add active_brand_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_brand_id UUID REFERENCES brands(id);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_brands_owner_id ON brands(owner_id);
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_invite_code ON brands(invite_code) WHERE invite_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brand_members_user_id ON brand_members(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_members_brand_id ON brand_members(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_members_status ON brand_members(status);
CREATE INDEX IF NOT EXISTS idx_profiles_active_brand_id ON profiles(active_brand_id) WHERE active_brand_id IS NOT NULL;

-- 5. Enable RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_members ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for brands
CREATE POLICY brands_select ON brands FOR SELECT TO authenticated USING (true);
CREATE POLICY brands_insert ON brands FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY brands_update ON brands FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY brands_delete ON brands FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- 7. RLS Policies for brand_members
CREATE POLICY brand_members_select ON brand_members FOR SELECT TO authenticated
  USING (
    brand_id IN (SELECT bm.brand_id FROM brand_members bm WHERE bm.user_id = auth.uid() AND bm.status = 'active')
    OR user_id = auth.uid()
  );
CREATE POLICY brand_members_insert ON brand_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR brand_id IN (SELECT b.id FROM brands b WHERE b.owner_id = auth.uid())
  );
CREATE POLICY brand_members_update ON brand_members FOR UPDATE TO authenticated
  USING (
    brand_id IN (SELECT b.id FROM brands b WHERE b.owner_id = auth.uid())
    OR user_id = auth.uid()
  );
CREATE POLICY brand_members_delete ON brand_members FOR DELETE TO authenticated
  USING (
    brand_id IN (SELECT b.id FROM brands b WHERE b.owner_id = auth.uid())
    OR user_id = auth.uid()
  );

-- 8. GRANT permissions
GRANT ALL ON brands TO authenticated;
GRANT ALL ON brand_members TO authenticated;
GRANT SELECT ON brands TO anon;
