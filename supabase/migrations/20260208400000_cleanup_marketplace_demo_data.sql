-- ============================================================
-- Cleanup: Remove ALL marketplace demo/test data before production
-- Keeps: creator_profiles, portfolio_items, creator_services (real user data)
-- Deletes: campaigns, projects, deliveries, reviews, applications,
--          talent lists, invitations, inquiries, brands, media
-- Applied: 2026-02-08 via Management API
-- ============================================================

BEGIN;

-- 1. Leaf tables first (no children depend on these)
DELETE FROM marketplace_media;
DELETE FROM campaign_invitations;
DELETE FROM campaign_deliverables;

-- 2. Project children
DELETE FROM project_deliveries;
DELETE FROM creator_reviews;

-- 3. Campaign children
DELETE FROM campaign_applications;
DELETE FROM saved_creators;

-- 4. Projects (child of brands & campaigns)
DELETE FROM marketplace_projects;

-- 5. Campaigns (child of brands)
DELETE FROM marketplace_campaigns;

-- 6. Org marketplace tables
DELETE FROM org_talent_list_members;
DELETE FROM org_talent_lists;
DELETE FROM marketplace_org_invitations;
DELETE FROM org_services;
DELETE FROM org_reviews;
DELETE FROM org_inquiries;
DELETE FROM portfolio_inquiries;

-- 7. Clear brand references from profiles, then delete brands
UPDATE profiles SET active_brand_id = NULL WHERE active_brand_id IS NOT NULL;
DELETE FROM brand_members;
DELETE FROM brands;

-- 8. Reset rating/project stats on creator_profiles (reviews were deleted)
UPDATE creator_profiles SET
  rating_avg = 0,
  rating_count = 0,
  completed_projects = 0;

COMMIT;
