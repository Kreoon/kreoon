-- Function to sync data to GHL via edge function
CREATE OR REPLACE FUNCTION public.sync_to_ghl()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_type TEXT;
  payload JSONB;
  supabase_url TEXT;
BEGIN
  -- Get the Supabase URL from environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  
  -- Determine event type based on table and operation
  IF TG_TABLE_NAME = 'clients' AND TG_OP = 'INSERT' THEN
    event_type := 'new_client';
    payload := to_jsonb(NEW);
  ELSIF TG_TABLE_NAME = 'profiles' AND TG_OP = 'INSERT' THEN
    event_type := 'new_lead';
    payload := to_jsonb(NEW);
  ELSIF TG_TABLE_NAME = 'content' AND TG_OP = 'UPDATE' THEN
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
      event_type := 'content_approved';
      payload := to_jsonb(NEW);
    ELSIF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
      event_type := 'content_delivered';
      payload := to_jsonb(NEW);
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'payments' AND TG_OP = 'INSERT' THEN
    event_type := 'payment_created';
    payload := to_jsonb(NEW);
  ELSIF TG_TABLE_NAME = 'client_packages' AND TG_OP = 'INSERT' THEN
    event_type := 'payment_created';
    payload := jsonb_build_object(
      'id', NEW.id,
      'payment_type', 'package',
      'amount', NEW.total_value,
      'currency', NEW.currency,
      'status', NEW.payment_status,
      'client_id', NEW.client_id,
      'name', NEW.name
    );
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Log the sync attempt
  INSERT INTO audit_logs (user_id, entity_type, entity_id, action, details)
  VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'ghl_sync',
    COALESCE(NEW.id, OLD.id),
    'sync_triggered',
    jsonb_build_object('event_type', event_type, 'table', TG_TABLE_NAME)
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create triggers for automatic GHL sync

-- Trigger for new clients
DROP TRIGGER IF EXISTS sync_client_to_ghl ON public.clients;
CREATE TRIGGER sync_client_to_ghl
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_to_ghl();

-- Trigger for new profiles (leads)
DROP TRIGGER IF EXISTS sync_profile_to_ghl ON public.profiles;
CREATE TRIGGER sync_profile_to_ghl
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_to_ghl();

-- Trigger for content status changes
DROP TRIGGER IF EXISTS sync_content_to_ghl ON public.content;
CREATE TRIGGER sync_content_to_ghl
  AFTER UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_to_ghl();

-- Trigger for new payments
DROP TRIGGER IF EXISTS sync_payment_to_ghl ON public.payments;
CREATE TRIGGER sync_payment_to_ghl
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_to_ghl();

-- Trigger for new packages
DROP TRIGGER IF EXISTS sync_package_to_ghl ON public.client_packages;
CREATE TRIGGER sync_package_to_ghl
  AFTER INSERT ON public.client_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_to_ghl();