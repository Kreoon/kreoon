-- Allow unauthenticated users to load org registration pages by slug
-- This prevents "Organización no encontrada" on /auth/org/:slug when RLS is enabled.

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Public read access ONLY for orgs that are open for registration and not blocked
CREATE POLICY "Public can read open organizations"
ON public.organizations
FOR SELECT
USING (
  is_registration_open = true
  AND COALESCE(is_blocked, false) = false
);
