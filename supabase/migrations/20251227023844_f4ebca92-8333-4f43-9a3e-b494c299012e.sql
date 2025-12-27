-- Add platform-root helper (SECURITY DEFINER so it can be safely used in RLS)
CREATE OR REPLACE FUNCTION public.is_platform_root(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND lower(p.email) = 'jacsolucionesgraficas@gmail.com'
  );
$$;

-- PROFILES: allow platform root to read/update any profile (needed for platform user management)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Platform root can read all profiles'
  ) THEN
    CREATE POLICY "Platform root can read all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.is_platform_root(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Platform root can update all profiles'
  ) THEN
    CREATE POLICY "Platform root can update all profiles"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_platform_root(auth.uid()))
    WITH CHECK (public.is_platform_root(auth.uid()));
  END IF;
END$$;

-- ORGANIZATIONS: allow platform root to read all orgs
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'Platform root can read all organizations'
  ) THEN
    CREATE POLICY "Platform root can read all organizations"
    ON public.organizations
    FOR SELECT
    TO authenticated
    USING (public.is_platform_root(auth.uid()));
  END IF;
END$$;

-- ORGANIZATION_MEMBERS: allow platform root full management
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'Platform root can read all organization_members'
  ) THEN
    CREATE POLICY "Platform root can read all organization_members"
    ON public.organization_members
    FOR SELECT
    TO authenticated
    USING (public.is_platform_root(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'Platform root can insert organization_members'
  ) THEN
    CREATE POLICY "Platform root can insert organization_members"
    ON public.organization_members
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_platform_root(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'Platform root can update organization_members'
  ) THEN
    CREATE POLICY "Platform root can update organization_members"
    ON public.organization_members
    FOR UPDATE
    TO authenticated
    USING (public.is_platform_root(auth.uid()))
    WITH CHECK (public.is_platform_root(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'Platform root can delete organization_members'
  ) THEN
    CREATE POLICY "Platform root can delete organization_members"
    ON public.organization_members
    FOR DELETE
    TO authenticated
    USING (public.is_platform_root(auth.uid()));
  END IF;
END$$;

-- ORGANIZATION_MEMBER_ROLES: allow platform root full management
ALTER TABLE public.organization_member_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'organization_member_roles' AND policyname = 'Platform root can read all organization_member_roles'
  ) THEN
    CREATE POLICY "Platform root can read all organization_member_roles"
    ON public.organization_member_roles
    FOR SELECT
    TO authenticated
    USING (public.is_platform_root(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'organization_member_roles' AND policyname = 'Platform root can insert organization_member_roles'
  ) THEN
    CREATE POLICY "Platform root can insert organization_member_roles"
    ON public.organization_member_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_platform_root(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'organization_member_roles' AND policyname = 'Platform root can update organization_member_roles'
  ) THEN
    CREATE POLICY "Platform root can update organization_member_roles"
    ON public.organization_member_roles
    FOR UPDATE
    TO authenticated
    USING (public.is_platform_root(auth.uid()))
    WITH CHECK (public.is_platform_root(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'organization_member_roles' AND policyname = 'Platform root can delete organization_member_roles'
  ) THEN
    CREATE POLICY "Platform root can delete organization_member_roles"
    ON public.organization_member_roles
    FOR DELETE
    TO authenticated
    USING (public.is_platform_root(auth.uid()));
  END IF;
END$$;