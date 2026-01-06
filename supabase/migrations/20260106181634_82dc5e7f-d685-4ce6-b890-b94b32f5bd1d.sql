-- Create trigger to auto-update organization_status when user gets assigned to org
CREATE OR REPLACE FUNCTION public.auto_activate_user_on_org_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a user is assigned to an organization, update their profile status to active
  UPDATE public.profiles
  SET 
    organization_status = 'active',
    current_organization_id = COALESCE(current_organization_id, NEW.organization_id)
  WHERE id = NEW.user_id
    AND (organization_status = 'pending_assignment' OR organization_status IS NULL);
  
  RETURN NEW;
END;
$$;

-- Create trigger on organization_member_roles
DROP TRIGGER IF EXISTS on_org_member_role_assigned ON public.organization_member_roles;
CREATE TRIGGER on_org_member_role_assigned
  AFTER INSERT ON public.organization_member_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_activate_user_on_org_assignment();

-- Also fix any existing users that are stuck in pending
UPDATE public.profiles p
SET organization_status = 'active'
WHERE p.organization_status = 'pending_assignment'
  AND EXISTS (
    SELECT 1 FROM public.organization_member_roles omr
    WHERE omr.user_id = p.id
  );