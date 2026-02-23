-- Allow multiple internal brands per organization
-- Previously only one was allowed via a partial unique index
DROP INDEX IF EXISTS idx_unique_internal_brand_per_org;
