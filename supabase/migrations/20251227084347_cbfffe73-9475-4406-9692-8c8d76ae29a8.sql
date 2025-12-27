-- Allow platform admins (user_roles=admin) or org owners to manage org AI settings.

-- organization_ai_providers policies
DROP POLICY IF EXISTS "Org owners can insert AI providers" ON public.organization_ai_providers;
DROP POLICY IF EXISTS "Org owners can update AI providers" ON public.organization_ai_providers;
DROP POLICY IF EXISTS "Org owners can delete AI providers" ON public.organization_ai_providers;

CREATE POLICY "Org owners/admins can insert AI providers"
ON public.organization_ai_providers
FOR INSERT
WITH CHECK (
  public.is_org_owner(auth.uid(), organization_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Org owners/admins can update AI providers"
ON public.organization_ai_providers
FOR UPDATE
USING (
  public.is_org_owner(auth.uid(), organization_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.is_org_owner(auth.uid(), organization_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Org owners/admins can delete AI providers"
ON public.organization_ai_providers
FOR DELETE
USING (
  public.is_org_owner(auth.uid(), organization_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- organization_ai_defaults policies
DROP POLICY IF EXISTS "Org owners can insert AI defaults" ON public.organization_ai_defaults;
DROP POLICY IF EXISTS "Org owners can update AI defaults" ON public.organization_ai_defaults;

CREATE POLICY "Org owners/admins can insert AI defaults"
ON public.organization_ai_defaults
FOR INSERT
WITH CHECK (
  public.is_org_owner(auth.uid(), organization_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Org owners/admins can update AI defaults"
ON public.organization_ai_defaults
FOR UPDATE
USING (
  public.is_org_owner(auth.uid(), organization_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.is_org_owner(auth.uid(), organization_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Fix linter: set immutable search_path for functions missing it
CREATE OR REPLACE FUNCTION public.generate_content_sequence_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  -- Get the next sequence number
  SELECT COALESCE(MAX(
    CASE 
      WHEN sequence_number ~ '^V-[0-9]+$' 
      THEN CAST(SUBSTRING(sequence_number FROM 3) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM public.content
  WHERE organization_id = NEW.organization_id;
  
  -- Format as V-00001
  formatted_number := 'V-' || LPAD(next_number::TEXT, 5, '0');
  
  NEW.sequence_number := formatted_number;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_up_level(points integer)
RETURNS public.up_level
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  thresholds jsonb;
BEGIN
  SELECT value INTO thresholds FROM public.up_settings WHERE key = 'level_thresholds';
  
  IF thresholds IS NULL THEN
    thresholds := '{"bronze": 0, "silver": 100, "gold": 250, "diamond": 500}'::jsonb;
  END IF;
  
  IF points >= (thresholds->>'diamond')::integer THEN
    RETURN 'diamond';
  ELSIF points >= (thresholds->>'gold')::integer THEN
    RETURN 'gold';
  ELSIF points >= (thresholds->>'silver')::integer THEN
    RETURN 'silver';
  ELSE
    RETURN 'bronze';
  END IF;
END;
$$;