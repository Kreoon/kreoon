-- Actualizar get_client_packages_with_availability para incluir campaign_number

DROP FUNCTION IF EXISTS public.get_client_packages_with_availability(UUID);

CREATE FUNCTION public.get_client_packages_with_availability(
  p_client_id UUID
)
RETURNS TABLE (
  id              UUID,
  name            TEXT,
  campaign_number BIGINT,
  hooks_per_video INT,
  is_active       BOOLEAN,
  content_quantity INT,
  assigned_count  BIGINT,
  available_slots INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.name,
    cp.campaign_number,
    cp.hooks_per_video,
    cp.is_active,
    cp.content_quantity,
    COUNT(c.id)                                                         AS assigned_count,
    GREATEST(0, cp.content_quantity - COUNT(c.id)::int)::int           AS available_slots
  FROM client_packages cp
  LEFT JOIN content c ON c.client_package_id = cp.id
  WHERE cp.client_id = p_client_id
  GROUP BY cp.id, cp.name, cp.campaign_number, cp.hooks_per_video, cp.is_active, cp.content_quantity
  ORDER BY cp.is_active DESC, cp.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_packages_with_availability(UUID) TO authenticated;
