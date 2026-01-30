
-- Mejorar la función is_platform_root para verificar también por email en auth.jwt()
-- Esto permite que el root admin funcione incluso si hay desajuste de IDs

CREATE OR REPLACE FUNCTION public.is_platform_root(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  root_emails text[] := ARRAY['jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com'];
BEGIN
  -- Primero intentar por ID en profiles
  SELECT email INTO user_email
  FROM public.profiles
  WHERE id = _user_id;
  
  IF user_email IS NOT NULL AND user_email = ANY(root_emails) THEN
    RETURN TRUE;
  END IF;
  
  -- Fallback: verificar email en JWT claims directamente
  BEGIN
    user_email := auth.jwt()->>'email';
    IF user_email IS NOT NULL AND user_email = ANY(root_emails) THEN
      RETURN TRUE;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Si falla, ignorar
    NULL;
  END;
  
  RETURN FALSE;
END;
$$;

-- También agregar una política más permisiva para los root admins basada en email del JWT
CREATE OR REPLACE FUNCTION public.is_root_by_jwt_email()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt()->>'email') = ANY(ARRAY['jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com']),
    FALSE
  )
$$;

-- Agregar política adicional para que root admins puedan ver todos los perfiles
DROP POLICY IF EXISTS "Root admins by email can read all profiles" ON public.profiles;
CREATE POLICY "Root admins by email can read all profiles"
ON public.profiles
FOR SELECT
USING (is_root_by_jwt_email());

-- Agregar política para que root admins puedan ver todo el contenido
DROP POLICY IF EXISTS "Root admins by email can view all content" ON public.content;
CREATE POLICY "Root admins by email can view all content"
ON public.content
FOR SELECT
USING (is_root_by_jwt_email());
