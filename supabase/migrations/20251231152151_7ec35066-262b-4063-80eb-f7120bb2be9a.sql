-- Ensure profile gets current_organization_id even if membership is created before profile row exists

CREATE OR REPLACE FUNCTION public.sync_profile_current_org_from_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF NEW.current_organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT om.organization_id
    INTO v_org_id
  FROM public.organization_members om
  WHERE om.user_id = NEW.id
  ORDER BY om.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    UPDATE public.profiles
    SET current_organization_id = v_org_id
    WHERE id = NEW.id AND current_organization_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_current_org_from_members ON public.profiles;
CREATE TRIGGER trg_sync_profile_current_org_from_members
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_current_org_from_members();