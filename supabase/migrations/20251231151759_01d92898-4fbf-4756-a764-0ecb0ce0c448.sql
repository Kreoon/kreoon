-- Update platform root function to include both emails
CREATE OR REPLACE FUNCTION public.is_platform_root(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND lower(p.email) IN ('jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com')
  );
$$;