-- Relanzamiento Kreoon / UGC Colombia — Fase 6: membresias de marca solo en marcas propias.
--
-- Hallazgo [VIVO 2026-09-30]: policy brand_members_insert (INSERT, authenticated):
--   (user_id = auth.uid()) OR (brand_id IN brands propias) OR is_platform_root(auth.uid())
-- La primera rama no restringe brand_id NI role/status: cualquier usuario autenticado puede insertarse
-- como miembro —incluso role='owner', status='active'— de CUALQUIER marca y pasar a las policies que
-- confian en ser owner de esa marca (p. ej. "Brand owners can insert client for their brand").
--
-- Fix: solo se inserta membresia en marcas de las que se es propietario (incluye la auto-membresia
-- 'owner' al crear la marca propia: ClientDashboard, UpgradeToBrandWizard) o el propietario de la plataforma
-- (BrandsCRM crea la marca con owner_id de otra persona). Las invitaciones de equipo a una marca
-- las agrega su propietario, que ya estaba permitido.

--
-- Ajuste 2026-10-01 (antes de aplicar): dos flujos legítimos insertaban como la persona que se une:
--   · «Solicitar unirse» (useBrandSearch.requestJoin): status 'pending' → se permite SOLO así
--     (role 'member', status 'pending'); una solicitud pendiente no da acceso a nada (las policies y
--     funciones que confían en brand_members exigen status 'active').
--   · «Unirse con código» (useBrandSearch.joinByCode): validaba el código en el navegador e insertaba
--     'active' directo. Pasa a public.join_brand_with_code, que valida el código en el servidor.
-- Pendiente aparte: brands.invite_code es legible por cualquier usuario autenticado (brands_select = true);
-- moverlo a una tabla privada cierra el último hueco.

DROP POLICY IF EXISTS brand_members_insert ON public.brand_members;

CREATE POLICY brand_members_insert ON public.brand_members
  FOR INSERT TO authenticated
  WITH CHECK (
    brand_id IN (SELECT b.id FROM public.brands b WHERE b.owner_id = auth.uid())
    OR public.is_platform_root(auth.uid())
    OR (user_id = auth.uid() AND role = 'member' AND status = 'pending')
  );

CREATE OR REPLACE FUNCTION public.join_brand_with_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_brand_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF p_code IS NULL OR length(trim(p_code)) < 4 THEN
    RAISE EXCEPTION 'Codigo de invitacion no valido';
  END IF;

  SELECT id INTO v_brand_id
  FROM brands
  WHERE invite_code = upper(trim(p_code)) AND deleted_at IS NULL
  LIMIT 1;

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'Codigo de invitacion no valido';
  END IF;

  IF EXISTS (SELECT 1 FROM brand_members WHERE brand_id = v_brand_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'Ya perteneces a esta marca' USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO brand_members (brand_id, user_id, role, status)
  VALUES (v_brand_id, v_uid, 'member', 'active');

  RETURN v_brand_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.join_brand_with_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_brand_with_code(text) TO authenticated, service_role;

-- Leer membresías de comunidad de una marca exige ser miembro ACTIVO (antes bastaba una solicitud)
DROP POLICY IF EXISTS "Users can read brand memberships" ON public.partner_community_memberships;
CREATE POLICY "Users can read brand memberships" ON public.partner_community_memberships
  FOR SELECT
  USING (brand_id IN (SELECT bm.brand_id FROM public.brand_members bm WHERE bm.user_id = auth.uid() AND bm.status = 'active'));

NOTIFY pgrst, 'reload schema';
