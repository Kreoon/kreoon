-- Ensure profile gets current_organization_id regardless of insert order (profile first or membership first)

-- 1) Trigger on organization_members to sync into profiles
CREATE OR REPLACE FUNCTION public.sync_profile_current_org_from_member_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If profile exists and doesn't have a current org yet, set it
  UPDATE public.profiles
  SET current_organization_id = NEW.organization_id
  WHERE id = NEW.user_id
    AND current_organization_id IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_current_org_from_member_insert ON public.organization_members;
CREATE TRIGGER trg_sync_profile_current_org_from_member_insert
AFTER INSERT ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_current_org_from_member_insert();

-- 2) One-time backfill for any existing users missing current_organization_id but having membership
UPDATE public.profiles p
SET current_organization_id = om.organization_id
FROM public.organization_members om
WHERE om.user_id = p.id
  AND p.current_organization_id IS NULL;