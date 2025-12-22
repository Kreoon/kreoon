-- Create function to auto-set payments to 0 for UGC Colombia ambassador content
CREATE OR REPLACE FUNCTION public.auto_zero_payment_ugc_ambassador()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ugc_colombia_id uuid := 'c8ae6c6d-a15d-46d9-b69e-465f7371595e';
  creator_is_ambassador boolean := false;
BEGIN
  -- Check if this is for UGC Colombia client
  IF NEW.client_id = ugc_colombia_id THEN
    -- Check if creator is an ambassador (either by profile flag or role)
    IF NEW.creator_id IS NOT NULL THEN
      SELECT 
        COALESCE(p.is_ambassador, false) OR EXISTS(
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = NEW.creator_id AND ur.role = 'ambassador'
        )
      INTO creator_is_ambassador
      FROM public.profiles p
      WHERE p.id = NEW.creator_id;
      
      -- If creator is ambassador, set payments to 0
      IF creator_is_ambassador THEN
        NEW.creator_payment := 0;
        NEW.editor_payment := 0;
        NEW.is_ambassador_content := true;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for INSERT
CREATE TRIGGER auto_zero_payment_ugc_ambassador_insert
BEFORE INSERT ON public.content
FOR EACH ROW
EXECUTE FUNCTION public.auto_zero_payment_ugc_ambassador();

-- Create trigger for UPDATE (when client or creator changes)
CREATE TRIGGER auto_zero_payment_ugc_ambassador_update
BEFORE UPDATE ON public.content
FOR EACH ROW
WHEN (OLD.client_id IS DISTINCT FROM NEW.client_id OR OLD.creator_id IS DISTINCT FROM NEW.creator_id)
EXECUTE FUNCTION public.auto_zero_payment_ugc_ambassador();