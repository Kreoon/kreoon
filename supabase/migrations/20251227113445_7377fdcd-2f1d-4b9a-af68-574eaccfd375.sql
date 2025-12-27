-- Function to auto-create internal brand client when organization is created
CREATE OR REPLACE FUNCTION public.create_internal_brand_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create internal brand client for the new organization
  INSERT INTO public.clients (
    name,
    organization_id,
    is_internal_brand,
    is_public,
    bio
  ) VALUES (
    NEW.name,
    NEW.id,
    true,
    false,
    'Marca interna de ' || NEW.name || ' para contenido de embajadores'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to create internal brand client on organization creation
DROP TRIGGER IF EXISTS trigger_create_internal_brand_client ON public.organizations;
CREATE TRIGGER trigger_create_internal_brand_client
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_internal_brand_client();