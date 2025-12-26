-- Corregir función audit_client_changes para manejar user_id null
CREATE OR REPLACE FUNCTION public.audit_client_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_performing uuid;
BEGIN
  user_performing := COALESCE(auth.uid(), NEW.created_by, OLD.created_by, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(
      user_performing,
      'client_created',
      'client',
      NEW.id,
      NEW.name,
      jsonb_build_object('contact_email', NEW.contact_email)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_activity(
      user_performing,
      'client_updated',
      'client',
      NEW.id,
      NEW.name,
      jsonb_build_object('changes', 'updated')
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_activity(
      user_performing,
      'client_deleted',
      'client',
      OLD.id,
      OLD.name,
      NULL
    );
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- También corregir log_activity para aceptar uuid con default
CREATE OR REPLACE FUNCTION public.log_activity(_user_id uuid, _action text, _entity_type text, _entity_id uuid DEFAULT NULL::uuid, _entity_name text DEFAULT NULL::text, _details jsonb DEFAULT NULL::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id uuid;
  safe_user_id uuid;
BEGIN
  safe_user_id := COALESCE(_user_id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, entity_name, details)
  VALUES (safe_user_id, _action, _entity_type, _entity_id, _entity_name, _details)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;