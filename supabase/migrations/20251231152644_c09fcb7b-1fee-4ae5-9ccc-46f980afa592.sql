-- Fix the trigger function to not use non-existent created_at column
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

  -- Get any organization membership for this user (without ordering by created_at)
  SELECT om.organization_id
    INTO v_org_id
  FROM public.organization_members om
  WHERE om.user_id = NEW.id
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    UPDATE public.profiles
    SET current_organization_id = v_org_id
    WHERE id = NEW.id AND current_organization_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;