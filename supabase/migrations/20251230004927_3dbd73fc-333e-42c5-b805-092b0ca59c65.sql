-- Add registration fields to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS registration_code TEXT,
ADD COLUMN IF NOT EXISTS registration_code_updated_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS registration_require_invite BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS registration_page_config JSONB DEFAULT '{"show_phone": false, "show_role_selector": false, "welcome_message": null, "custom_fields": []}'::jsonb;

-- Create index for registration code lookups
CREATE INDEX IF NOT EXISTS idx_organizations_registration_code ON public.organizations(registration_code) WHERE registration_code IS NOT NULL;

-- Create function to generate random registration code
CREATE OR REPLACE FUNCTION public.generate_registration_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
END;
$$;

-- Create function to regenerate organization registration code
CREATE OR REPLACE FUNCTION public.regenerate_org_registration_code(org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- Check if user is org owner or admin
  IF NOT (is_org_owner(auth.uid(), org_id) OR has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Not authorized to regenerate registration code';
  END IF;
  
  -- Generate new code
  new_code := generate_registration_code();
  
  -- Update organization
  UPDATE public.organizations
  SET 
    registration_code = new_code,
    registration_code_updated_at = now()
  WHERE id = org_id;
  
  RETURN new_code;
END;
$$;

-- Create table for registration attempts (rate limiting)
CREATE TABLE IF NOT EXISTS public.registration_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  attempted_code TEXT,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on registration_attempts
ALTER TABLE public.registration_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: System can insert attempts
CREATE POLICY "System can insert registration attempts" 
ON public.registration_attempts 
FOR INSERT 
WITH CHECK (true);

-- Policy: Org owners can view their org attempts
CREATE POLICY "Org owners can view registration attempts" 
ON public.registration_attempts 
FOR SELECT 
USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'));

-- Function to check rate limit for registration
CREATE OR REPLACE FUNCTION public.check_registration_rate_limit(ip TEXT, org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_attempts INT;
BEGIN
  -- Count failed attempts in last hour
  SELECT COUNT(*) INTO failed_attempts
  FROM public.registration_attempts
  WHERE ip_address = ip
    AND organization_id = org_id
    AND success = false
    AND created_at > now() - interval '1 hour';
  
  -- Return false if more than 5 failed attempts
  RETURN failed_attempts < 5;
END;
$$;

-- Function to validate registration code
CREATE OR REPLACE FUNCTION public.validate_registration_code(org_slug TEXT, code TEXT, ip TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_record RECORD;
  result JSONB;
BEGIN
  -- Find organization by slug
  SELECT * INTO org_record
  FROM public.organizations
  WHERE slug = org_slug;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'organization_not_found');
  END IF;
  
  -- Check if registration is enabled
  IF NOT COALESCE(org_record.is_registration_open, false) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'registration_disabled');
  END IF;
  
  -- Check rate limit
  IF NOT check_registration_rate_limit(ip, org_record.id) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'rate_limited');
  END IF;
  
  -- Check if invite is required
  IF COALESCE(org_record.registration_require_invite, true) THEN
    -- Validate code
    IF org_record.registration_code IS NULL OR org_record.registration_code != upper(code) THEN
      -- Log failed attempt
      INSERT INTO public.registration_attempts (ip_address, organization_id, attempted_code, success)
      VALUES (ip, org_record.id, code, false);
      
      RETURN jsonb_build_object('valid', false, 'error', 'invalid_code');
    END IF;
  END IF;
  
  -- Log successful attempt
  INSERT INTO public.registration_attempts (ip_address, organization_id, attempted_code, success)
  VALUES (ip, org_record.id, code, true);
  
  RETURN jsonb_build_object(
    'valid', true, 
    'organization_id', org_record.id,
    'organization_name', org_record.name,
    'default_role', COALESCE(org_record.default_role, 'creator'),
    'page_config', COALESCE(org_record.registration_page_config, '{}'::jsonb)
  );
END;
$$;

-- Generate initial codes for organizations that have registration open
UPDATE public.organizations
SET registration_code = generate_registration_code()
WHERE is_registration_open = true AND registration_code IS NULL;