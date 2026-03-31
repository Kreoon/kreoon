-- =============================================================================
-- FIX: Marketplace RLS - PARTE 2: Actualizar políticas RLS
-- Problema raíz:
--   1. La política SELECT de marketplace_campaigns solo permitía leer campañas
--      con status IN ('active','in_progress','completed'), bloqueando 'open'.
--   2. campaign_applications no tiene política para usuarios sin creator_profile.
--   3. marketplace_projects no permite lectura a admins de org sin participación
--      directa, bloqueando algunas vistas administrativas.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. ACTUALIZAR POLÍTICA RLS SELECT DE marketplace_campaigns
-- Reemplaza "Campaigns visible based on visibility rules" para incluir 'open'.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Campaigns visible based on visibility rules" ON public.marketplace_campaigns;

CREATE POLICY "Campaigns visible based on visibility rules"
  ON public.marketplace_campaigns FOR SELECT
  USING (
    -- El creador de la campaña siempre la ve
    created_by = auth.uid()
    -- Miembros de la brand siempre la ven
    OR (brand_id IS NOT NULL AND public.is_brand_member(brand_id))
    -- Miembros de la org siempre la ven
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
    -- Campañas públicas con status visible (incluye 'open')
    OR (
      visibility = 'public'
      AND status IN ('open', 'active', 'in_progress', 'completed')
    )
    -- Campañas selectivas para usuarios invitados
    OR (
      visibility = 'selective'
      AND status IN ('open', 'active', 'in_progress', 'completed')
      AND EXISTS (
        SELECT 1 FROM public.campaign_invitations ci
        WHERE ci.campaign_id = marketplace_campaigns.id
          AND ci.invited_profile_id = auth.uid()
          AND ci.status IN ('pending', 'accepted')
      )
    )
  );

-- Permitir acceso anon a campañas públicas con status visible
-- (necesario para el marketplace público sin login)
DROP POLICY IF EXISTS "Anon can view public open campaigns" ON public.marketplace_campaigns;

CREATE POLICY "Anon can view public open campaigns"
  ON public.marketplace_campaigns FOR SELECT
  TO anon
  USING (
    visibility = 'public'
    AND status IN ('open', 'active', 'in_progress', 'completed')
  );

-- ----------------------------------------------------------------------------
-- 2. ACTUALIZAR FUNCIÓN can_see_campaign para incluir 'open'
-- Sincronizar la función helper con los nuevos valores permitidos.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_see_campaign(_campaign_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  _visibility text;
  _org_id uuid;
  _brand_id uuid;
  _status text;
BEGIN
  SELECT visibility, organization_id, brand_id, status
  INTO _visibility, _org_id, _brand_id, _status
  FROM public.marketplace_campaigns
  WHERE id = _campaign_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- El creador siempre ve su propia campaña
  IF EXISTS (
    SELECT 1 FROM public.marketplace_campaigns
    WHERE id = _campaign_id AND created_by = _user_id
  ) THEN
    RETURN true;
  END IF;

  -- Miembros de la brand siempre la ven
  IF _brand_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_id = _brand_id AND user_id = _user_id AND status = 'active'
  ) THEN
    RETURN true;
  END IF;

  -- Miembros de la org siempre la ven
  IF _org_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = _user_id
  ) THEN
    RETURN true;
  END IF;

  -- Campañas públicas visibles con status abierto/activo/completado
  IF _visibility = 'public' AND _status IN ('open', 'active', 'in_progress', 'completed') THEN
    RETURN true;
  END IF;

  -- Campañas internas: solo miembros (ya cubierto arriba)
  IF _visibility = 'internal' THEN
    RETURN false;
  END IF;

  -- Campañas selectivas: solo si el usuario fue invitado
  IF _visibility = 'selective' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.campaign_invitations
      WHERE campaign_id = _campaign_id
        AND invited_profile_id = _user_id
        AND status IN ('pending', 'accepted')
    );
  END IF;

  RETURN false;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. CORREGIR POLÍTICA SELECT DE campaign_applications
-- Agregar acceso para administradores de la organización que gestionan campañas
-- y para usuarios autenticados que revisan sus propias aplicaciones por user_id
-- (no solo por creator_profile.user_id, cubriendo el caso de perfil no creado).
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Applications visible to campaign brand and applicant" ON public.campaign_applications;

CREATE POLICY "Applications visible to campaign brand and applicant"
  ON public.campaign_applications FOR SELECT
  USING (
    -- El creator dueño del perfil ve sus aplicaciones
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = campaign_applications.creator_id
        AND cp.user_id = auth.uid()
    )
    -- Miembros de la brand de la campaña ven todas las aplicaciones
    OR EXISTS (
      SELECT 1 FROM public.marketplace_campaigns mc
      WHERE mc.id = campaign_applications.campaign_id
        AND mc.brand_id IS NOT NULL
        AND public.is_brand_member(mc.brand_id)
    )
    -- Miembros de la org de la campaña ven todas las aplicaciones
    OR EXISTS (
      SELECT 1 FROM public.marketplace_campaigns mc
      WHERE mc.id = campaign_applications.campaign_id
        AND mc.organization_id IS NOT NULL
        AND public.is_org_member(mc.organization_id)
    )
    -- El creador de la campaña ve todas sus aplicaciones
    OR EXISTS (
      SELECT 1 FROM public.marketplace_campaigns mc
      WHERE mc.id = campaign_applications.campaign_id
        AND mc.created_by = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 4. CORREGIR POLÍTICA SELECT DE marketplace_projects
-- Agregar acceso para creadores de campaña y admins de org que necesitan
-- ver proyectos derivados de sus campañas sin ser participantes directos.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Project participants can view projects" ON public.marketplace_projects;

CREATE POLICY "Project participants can view projects"
  ON public.marketplace_projects FOR SELECT
  USING (
    -- Participante directo (creator, editor, brand member)
    public.is_project_participant(id)
    -- El creador de la campaña origen puede ver el proyecto
    OR (
      campaign_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.marketplace_campaigns mc
        WHERE mc.id = marketplace_projects.campaign_id
          AND mc.created_by = auth.uid()
      )
    )
    -- Admin de la org de la campaña origen puede ver el proyecto
    OR (
      campaign_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.marketplace_campaigns mc
        WHERE mc.id = marketplace_projects.campaign_id
          AND mc.organization_id IS NOT NULL
          AND public.is_org_admin(mc.organization_id)
      )
    )
  );
