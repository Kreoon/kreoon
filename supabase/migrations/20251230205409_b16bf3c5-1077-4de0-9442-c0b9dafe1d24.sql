-- Allow anonymous/public access to read basic organization info for registration pages
CREATE POLICY "Public can view organizations for registration"
ON public.organizations
FOR SELECT
TO anon, authenticated
USING (
  -- Only expose organizations with open registration or that have a slug (for public access)
  is_registration_open = true OR slug IS NOT NULL
);