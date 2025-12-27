-- Add organization scoping to goals so each organization has independent targets
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Backfill existing rows to the original organization (UGC Colombia)
UPDATE public.goals
SET organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
WHERE organization_id IS NULL;

-- Make organization_id required going forward
ALTER TABLE public.goals
ALTER COLUMN organization_id SET NOT NULL;

-- Helpful index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_goals_org_period_year
ON public.goals (organization_id, period_type, period_value, year);

-- Enable RLS (safe even if already enabled)
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Policies: members of an org can read its goals
DROP POLICY IF EXISTS "Members can view org goals" ON public.goals;
CREATE POLICY "Members can view org goals"
ON public.goals
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

-- Policies: only org owners + platform admins can manage goals
DROP POLICY IF EXISTS "Org owners can manage org goals" ON public.goals;
CREATE POLICY "Org owners can manage org goals"
ON public.goals
FOR ALL
USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));
