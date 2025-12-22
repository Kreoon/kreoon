-- Create audit log table for tracking all user activities
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- System/triggers can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Function to log user activity
CREATE OR REPLACE FUNCTION public.log_activity(
  _user_id uuid,
  _action text,
  _entity_type text,
  _entity_id uuid DEFAULT NULL,
  _entity_name text DEFAULT NULL,
  _details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, entity_name, details)
  VALUES (_user_id, _action, _entity_type, _entity_id, _entity_name, _details)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Trigger function for content changes
CREATE OR REPLACE FUNCTION public.audit_content_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_type text;
  user_performing uuid;
BEGIN
  user_performing := COALESCE(auth.uid(), NEW.creator_id, OLD.creator_id);
  
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
    PERFORM public.log_activity(
      user_performing,
      'content_created',
      'content',
      NEW.id,
      NEW.title,
      jsonb_build_object('status', NEW.status, 'client_id', NEW.client_id)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM public.log_activity(
        user_performing,
        'content_status_changed',
        'content',
        NEW.id,
        NEW.title,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;
    
    -- Log editor assignment
    IF OLD.editor_id IS DISTINCT FROM NEW.editor_id AND NEW.editor_id IS NOT NULL THEN
      PERFORM public.log_activity(
        user_performing,
        'editor_assigned',
        'content',
        NEW.id,
        NEW.title,
        jsonb_build_object('editor_id', NEW.editor_id)
      );
    END IF;
    
    -- Log creator assignment
    IF OLD.creator_id IS DISTINCT FROM NEW.creator_id AND NEW.creator_id IS NOT NULL THEN
      PERFORM public.log_activity(
        user_performing,
        'creator_assigned',
        'content',
        NEW.id,
        NEW.title,
        jsonb_build_object('creator_id', NEW.creator_id)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_activity(
      user_performing,
      'content_deleted',
      'content',
      OLD.id,
      OLD.title,
      NULL
    );
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for client changes
CREATE OR REPLACE FUNCTION public.audit_client_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_performing uuid;
BEGIN
  user_performing := COALESCE(auth.uid(), NEW.created_by, OLD.created_by);
  
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

-- Trigger function for product changes
CREATE OR REPLACE FUNCTION public.audit_product_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_performing uuid;
BEGIN
  user_performing := auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(
      user_performing,
      'product_created',
      'product',
      NEW.id,
      NEW.name,
      jsonb_build_object('client_id', NEW.client_id)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_activity(
      user_performing,
      'product_updated',
      'product',
      NEW.id,
      NEW.name,
      NULL
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_activity(
      user_performing,
      'product_deleted',
      'product',
      OLD.id,
      OLD.name,
      NULL
    );
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER audit_content_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.content
FOR EACH ROW EXECUTE FUNCTION public.audit_content_changes();

CREATE TRIGGER audit_client_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.audit_client_changes();

CREATE TRIGGER audit_product_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.audit_product_changes();

-- Function to cleanup old audit logs (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.audit_logs WHERE created_at < now() - interval '30 days';
END;
$$;

-- Enable realtime for audit_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;