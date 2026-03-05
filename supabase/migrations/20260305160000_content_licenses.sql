-- ============================================
-- MIGRATION: Content Licensing System
-- Date: 2026-03-05
-- Description: Track content licenses, renewals, and expirations
-- ============================================

-- ============================================
-- 1. CONTENT LICENSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS content_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Content reference
  content_id UUID,                        -- FK to content table (if applicable)
  project_id UUID,                        -- FK to marketplace projects (if applicable)
  deliverable_category TEXT NOT NULL,

  -- License type
  license_type TEXT NOT NULL CHECK (license_type IN (
    'creator_full_cession',
    'client_1year_license',
    'client_full_ownership',
    'client_buyout'
  )),

  -- Parties
  creator_user_id UUID REFERENCES auth.users(id),
  client_id UUID REFERENCES clients(id),

  -- Scope
  territory TEXT DEFAULT 'worldwide',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,                       -- NULL = no expiration (perpetual)

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'renewed', 'revoked')),

  -- Renewals
  renewal_count INTEGER DEFAULT 0,
  last_renewed_at TIMESTAMPTZ,

  -- Permissions (JSONB for flexibility)
  permissions JSONB DEFAULT '{
    "ads_usage": true,
    "social_media": true,
    "website": true,
    "ecommerce": true,
    "print": false,
    "broadcast": false,
    "sublicense": false,
    "modify": true,
    "derivative_works": true
  }'::jsonb,

  -- Financial
  original_project_value NUMERIC(10,2),   -- Used to calculate renewal price
  renewal_rate NUMERIC(4,2),              -- e.g., 0.30 for 30%

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE content_licenses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Organization members can manage their licenses
CREATE POLICY "org_members_manage_licenses" ON content_licenses
FOR ALL TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Grants
GRANT ALL ON content_licenses TO authenticated;
GRANT ALL ON content_licenses TO service_role;

-- ============================================
-- 2. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_licenses_org ON content_licenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_licenses_content ON content_licenses(content_id);
CREATE INDEX IF NOT EXISTS idx_licenses_project ON content_licenses(project_id);
CREATE INDEX IF NOT EXISTS idx_licenses_client ON content_licenses(client_id);
CREATE INDEX IF NOT EXISTS idx_licenses_creator ON content_licenses(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry ON content_licenses(expiry_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_licenses_status ON content_licenses(status);

-- ============================================
-- 3. LICENSE EXPIRATION FUNCTIONS
-- ============================================

-- Function: Expire licenses that have passed their expiry date
CREATE OR REPLACE FUNCTION expire_content_licenses()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE content_licenses
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active'
      AND expiry_date IS NOT NULL
      AND expiry_date < CURRENT_DATE
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM updated;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION expire_content_licenses() TO service_role;

-- Function: Get licenses expiring within N days
CREATE OR REPLACE FUNCTION get_expiring_licenses(days_before INTEGER DEFAULT 30)
RETURNS TABLE (
  license_id UUID,
  organization_id UUID,
  client_id UUID,
  content_id UUID,
  project_id UUID,
  creator_user_id UUID,
  deliverable_category TEXT,
  expiry_date DATE,
  days_remaining INTEGER,
  original_project_value NUMERIC,
  renewal_rate NUMERIC,
  estimated_renewal_price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cl.id AS license_id,
    cl.organization_id,
    cl.client_id,
    cl.content_id,
    cl.project_id,
    cl.creator_user_id,
    cl.deliverable_category,
    cl.expiry_date,
    (cl.expiry_date - CURRENT_DATE)::integer AS days_remaining,
    cl.original_project_value,
    cl.renewal_rate,
    ROUND(COALESCE(cl.original_project_value, 0) * COALESCE(cl.renewal_rate, 0.30), 2) AS estimated_renewal_price
  FROM content_licenses cl
  WHERE cl.status = 'active'
    AND cl.expiry_date IS NOT NULL
    AND cl.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + (days_before || ' days')::interval)
  ORDER BY cl.expiry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_expiring_licenses(INTEGER) TO authenticated;

-- ============================================
-- 4. LICENSE CREATION HELPER
-- ============================================

-- Function: Create license when escrow is released
CREATE OR REPLACE FUNCTION create_content_license(
  p_organization_id UUID,
  p_content_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_deliverable_category TEXT DEFAULT 'other',
  p_creator_user_id UUID DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_territory TEXT DEFAULT 'worldwide',
  p_original_value NUMERIC DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_license_type TEXT;
  v_duration_months INTEGER;
  v_expiry_date DATE;
  v_renewal_rate NUMERIC;
  v_license_id UUID;
  v_permissions JSONB;
BEGIN
  -- Determine license type based on deliverable category
  CASE p_deliverable_category
    -- Full client ownership categories
    WHEN 'development', 'graphic_design', 'branding', 'strategy_document' THEN
      v_license_type := 'client_full_ownership';
      v_duration_months := NULL;
      v_expiry_date := NULL;
      v_renewal_rate := NULL;
      v_permissions := '{
        "ads_usage": true,
        "social_media": true,
        "website": true,
        "ecommerce": true,
        "print": true,
        "broadcast": true,
        "sublicense": true,
        "modify": true,
        "derivative_works": true
      }'::jsonb;

    -- 1-year license categories
    ELSE
      v_license_type := 'client_1year_license';
      v_duration_months := 12;
      v_expiry_date := CURRENT_DATE + INTERVAL '12 months';
      v_permissions := '{
        "ads_usage": true,
        "social_media": true,
        "website": true,
        "ecommerce": true,
        "print": false,
        "broadcast": false,
        "sublicense": false,
        "modify": true,
        "derivative_works": true
      }'::jsonb;

      -- Set renewal rate based on category
      CASE p_deliverable_category
        WHEN 'video_with_creator' THEN v_renewal_rate := 0.30;
        WHEN 'photo_with_creator' THEN v_renewal_rate := 0.25;
        WHEN 'ugc_content' THEN v_renewal_rate := 0.30;
        WHEN 'live_recording' THEN v_renewal_rate := 0.20;
        WHEN 'product_photo' THEN v_renewal_rate := 0.20;
        WHEN 'broll_video' THEN v_renewal_rate := 0.20;
        ELSE v_renewal_rate := 0.25;
      END CASE;
  END CASE;

  -- Insert the license
  INSERT INTO content_licenses (
    organization_id,
    content_id,
    project_id,
    deliverable_category,
    license_type,
    creator_user_id,
    client_id,
    territory,
    start_date,
    expiry_date,
    status,
    permissions,
    original_project_value,
    renewal_rate
  ) VALUES (
    p_organization_id,
    p_content_id,
    p_project_id,
    p_deliverable_category,
    v_license_type,
    p_creator_user_id,
    p_client_id,
    p_territory,
    CURRENT_DATE,
    v_expiry_date,
    'active',
    v_permissions,
    p_original_value,
    v_renewal_rate
  )
  RETURNING id INTO v_license_id;

  RETURN v_license_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_content_license(UUID, UUID, UUID, TEXT, UUID, UUID, TEXT, NUMERIC) TO authenticated;

-- ============================================
-- 5. LICENSE RENEWAL FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION renew_content_license(
  p_license_id UUID,
  p_additional_months INTEGER DEFAULT 12
)
RETURNS BOOLEAN AS $$
DECLARE
  v_license content_licenses%ROWTYPE;
BEGIN
  -- Get current license
  SELECT * INTO v_license
  FROM content_licenses
  WHERE id = p_license_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'License not found';
  END IF;

  -- Only 1-year licenses can be renewed
  IF v_license.license_type != 'client_1year_license' THEN
    RAISE EXCEPTION 'Only 1-year licenses can be renewed';
  END IF;

  -- Renew the license
  UPDATE content_licenses
  SET
    expiry_date = COALESCE(expiry_date, CURRENT_DATE) + (p_additional_months || ' months')::interval,
    status = 'renewed',
    renewal_count = renewal_count + 1,
    last_renewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_license_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION renew_content_license(UUID, INTEGER) TO authenticated;

-- ============================================
-- 6. GET CLIENT LICENSES FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_client_licenses(
  p_client_id UUID,
  p_status TEXT DEFAULT NULL
)
RETURNS SETOF content_licenses AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM content_licenses
  WHERE client_id = p_client_id
    AND (p_status IS NULL OR status = p_status)
  ORDER BY
    CASE WHEN status = 'active' THEN 0 ELSE 1 END,
    expiry_date ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_client_licenses(UUID, TEXT) TO authenticated;

-- ============================================
-- 7. AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_content_license_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_content_licenses_updated ON content_licenses;
CREATE TRIGGER tr_content_licenses_updated
  BEFORE UPDATE ON content_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_content_license_timestamp();

-- ============================================
-- 8. LICENSE NOTIFICATIONS VIEW
-- ============================================

CREATE OR REPLACE VIEW v_license_expiration_notices AS
SELECT
  cl.id AS license_id,
  cl.organization_id,
  cl.client_id,
  c.name AS client_name,
  cl.content_id,
  cl.project_id,
  cl.creator_user_id,
  p.full_name AS creator_name,
  cl.deliverable_category,
  cl.expiry_date,
  (cl.expiry_date - CURRENT_DATE)::integer AS days_remaining,
  cl.original_project_value,
  cl.renewal_rate,
  ROUND(COALESCE(cl.original_project_value, 0) * COALESCE(cl.renewal_rate, 0.30), 2) AS estimated_renewal_price
FROM content_licenses cl
LEFT JOIN clients c ON c.id = cl.client_id
LEFT JOIN profiles p ON p.id = cl.creator_user_id
WHERE cl.status = 'active'
  AND cl.expiry_date IS NOT NULL
  AND cl.expiry_date <= CURRENT_DATE + INTERVAL '30 days';

GRANT SELECT ON v_license_expiration_notices TO authenticated;

-- ============================================
-- NOTIFY SCHEMA RELOAD
-- ============================================

NOTIFY pgrst, 'reload schema';
