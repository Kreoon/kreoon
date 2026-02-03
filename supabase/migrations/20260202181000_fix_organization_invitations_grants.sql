-- Fix 403: organization_invitations - permission denied for table (42501)

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invitations TO authenticated;
