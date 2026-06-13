-- Datos mínimos requeridos en el onboarding obligatorio.
ALTER TABLE public.academy_memberships
  ADD COLUMN IF NOT EXISTS objective TEXT;

CREATE OR REPLACE FUNCTION public.save_academy_onboarding_data(
  p_space_id UUID,
  p_country TEXT,
  p_objective TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $func$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_country IS NULL OR LENGTH(TRIM(p_country)) < 2 THEN
    RAISE EXCEPTION 'invalid_country' USING ERRCODE = '22023';
  END IF;
  IF p_objective IS NULL OR LENGTH(TRIM(p_objective)) < 10 THEN
    RAISE EXCEPTION 'invalid_objective' USING ERRCODE = '22023';
  END IF;
  UPDATE academy_memberships
     SET country = p_country,
         objective = p_objective,
         onboarding_completed_at = COALESCE(onboarding_completed_at, NOW())
   WHERE space_id = p_space_id AND user_id = auth.uid();
END; $func$;

GRANT EXECUTE ON FUNCTION public.save_academy_onboarding_data(UUID, TEXT, TEXT)
  TO authenticated;
