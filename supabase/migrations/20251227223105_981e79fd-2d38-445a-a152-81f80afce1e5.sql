-- Enable realtime for organization_member_roles table (if not already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_member_roles;