-- FASE checklist seccion 3 (segunda pasada): get_org_client_users se
-- escapo del barrido anterior. SECURITY DEFINER, GRANTed a authenticated,
-- CERO validacion de membresia -- devolvia PII de clientes (email,
-- telefono, bio, empresas vinculadas) de CUALQUIER organizacion a
-- cualquier usuario logueado.

CREATE OR REPLACE FUNCTION public.get_org_client_users(p_org_id uuid)
RETURNS TABLE(user_id uuid, full_name text, email text, avatar_url text, phone text, city text, bio text, created_at timestamp with time zone, linked_companies jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.assert_org_member(p_org_id);

  RETURN QUERY
  WITH client_user_ids AS (
    SELECT DISTINCT om.user_id
    FROM organization_members om
    WHERE om.organization_id = p_org_id
      AND (
        om.role IN ('client', 'brand_manager', 'marketing_director')
        OR EXISTS (
          SELECT 1 FROM organization_member_roles omr
          WHERE omr.organization_id = p_org_id
            AND omr.user_id = om.user_id
            AND omr.role IN ('client', 'brand_manager', 'marketing_director')
        )
      )

    UNION

    SELECT DISTINCT cu.user_id
    FROM client_users cu
    JOIN clients c ON c.id = cu.client_id AND c.organization_id = p_org_id
  )
  SELECT
    p.id AS user_id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.phone,
    p.city,
    p.bio,
    p.created_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'client_id', c.id,
            'client_name', c.name,
            'role', COALESCE(cu.role, 'viewer')
          )
        )
        FROM client_users cu
        JOIN clients c ON c.id = cu.client_id AND c.organization_id = p_org_id
        WHERE cu.user_id = p.id
      ),
      '[]'::jsonb
    ) AS linked_companies
  FROM client_user_ids cui
  JOIN profiles p ON p.id = cui.user_id
  ORDER BY p.full_name;
END;
$function$;

NOTIFY pgrst, 'reload schema';
