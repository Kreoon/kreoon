-- Add 'new_member' notification type if not exists and create trigger for admin notifications

-- First, let's add the new notification type by altering the check constraint if it exists
-- or just allow it since the type column appears to be text

-- Create function to notify admins when a new member joins
CREATE OR REPLACE FUNCTION public.notify_admins_new_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_new_user_name text;
  v_new_user_email text;
  v_org_name text;
  v_role_label text;
BEGIN
  -- Get new user info
  SELECT full_name, email INTO v_new_user_name, v_new_user_email
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Get organization name
  SELECT name INTO v_org_name
  FROM public.organizations
  WHERE id = NEW.organization_id;

  -- Map role to Spanish label
  v_role_label := CASE NEW.role::text
    WHEN 'admin' THEN 'Administrador'
    WHEN 'creator' THEN 'Creador'
    WHEN 'editor' THEN 'Editor'
    WHEN 'client' THEN 'Cliente'
    WHEN 'strategist' THEN 'Estratega'
    WHEN 'ambassador' THEN 'Embajador'
    ELSE NEW.role::text
  END;

  -- Insert notification for each admin/owner in the organization (except the new user themselves)
  FOR v_admin_id IN
    SELECT DISTINCT om.user_id
    FROM public.organization_members om
    LEFT JOIN public.organization_member_roles omr ON om.user_id = omr.user_id AND om.organization_id = omr.organization_id
    WHERE om.organization_id = NEW.organization_id
      AND om.user_id != NEW.user_id
      AND (omr.role = 'admin' OR om.is_owner = true)
  LOOP
    INSERT INTO public.user_notifications (
      user_id,
      organization_id,
      type,
      title,
      message,
      entity_type,
      entity_id,
      is_read
    ) VALUES (
      v_admin_id,
      NEW.organization_id,
      'assignment',
      'Nuevo miembro registrado',
      COALESCE(v_new_user_name, v_new_user_email) || ' se ha registrado como ' || v_role_label,
      'profile',
      NEW.user_id,
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_member ON public.organization_members;
CREATE TRIGGER trg_notify_admins_new_member
AFTER INSERT ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_new_member();