-- Prevent duplicate internal brand clients per organization.
-- Root cause: useInternalBrandClient hook had a race condition + .maybeSingle() feedback loop
-- that created 740+ duplicates in a single day.

-- Safety: clean up any residual duplicates (keep oldest per org)
DELETE FROM public.clients
WHERE is_internal_brand = true
  AND id NOT IN (
    SELECT DISTINCT ON (organization_id) id
    FROM public.clients
    WHERE is_internal_brand = true
    ORDER BY organization_id, created_at ASC
  );

-- Partial unique index: one internal brand client per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_internal_brand_per_org
  ON public.clients (organization_id)
  WHERE is_internal_brand = true;
