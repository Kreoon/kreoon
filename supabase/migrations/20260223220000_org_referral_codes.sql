-- Add organization_id to referral_codes for org-level referral codes
ALTER TABLE referral_codes
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Index for org-level queries
CREATE INDEX IF NOT EXISTS idx_referral_codes_org
  ON referral_codes(organization_id)
  WHERE organization_id IS NOT NULL;

-- Grant access
GRANT ALL ON referral_codes TO authenticated;
GRANT ALL ON referral_codes TO service_role;

NOTIFY pgrst, 'reload schema';
