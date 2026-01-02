-- Allow users to read their own organization roles (multi-role switcher)
-- This fixes cases where organization_members row is missing but organization_member_roles exists.

ALTER TABLE public.organization_member_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_member_roles'
      AND policyname = 'Users can view their own org roles'
  ) THEN
    CREATE POLICY "Users can view their own org roles"
    ON public.organization_member_roles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;
