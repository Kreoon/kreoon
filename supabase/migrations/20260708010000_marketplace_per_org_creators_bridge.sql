-- FASE 1 del aislamiento del marketplace por organización.
--
-- Modelo (Alexander 2026-07-08): creator_profiles sigue GLOBAL (perfil
-- único del talento, wallet/pagos globales). El marketplace se aísla por
-- org vía esta tabla puente: cada org ve SOLO los creadores que reclutó.
-- Org nueva arranca vacía. Un creador puede estar en varias orgs.
-- Backfill: creadores activos con profile existente → KREOON, + los que
-- aparecían por contenido publicado (fallback). Excluye user_ids zombie
-- (creator_profiles.user_id sin FK a profiles, de usuarios borrados).

CREATE TABLE IF NOT EXISTS public.organization_marketplace_creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  creator_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',            -- active | invited | removed
  source text NOT NULL DEFAULT 'recruited',          -- recruited | invited | self_joined | backfill
  added_by uuid REFERENCES public.profiles(id),
  added_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, creator_user_id)
);

CREATE INDEX IF NOT EXISTS idx_omc_org_status
  ON public.organization_marketplace_creators (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_omc_creator
  ON public.organization_marketplace_creators (creator_user_id);

GRANT ALL ON public.organization_marketplace_creators TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_marketplace_creators TO authenticated;

-- Backfill 1: creator_profiles activos con profile existente → KREOON
INSERT INTO public.organization_marketplace_creators (organization_id, creator_user_id, status, source)
SELECT 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'::uuid, cp.user_id, 'active', 'backfill'
FROM public.creator_profiles cp
JOIN public.profiles p ON p.id = cp.user_id
WHERE cp.is_active = true
ON CONFLICT (organization_id, creator_user_id) DO NOTHING;

-- Backfill 2: perfiles que aparecían en el marketplace de KREOON por tener
-- contenido publicado (fallback de fetchAllCreators) — para no perder a nadie.
INSERT INTO public.organization_marketplace_creators (organization_id, creator_user_id, status, source)
SELECT DISTINCT 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'::uuid, c.creator_id, 'active', 'backfill'
FROM public.content c
JOIN public.profiles p ON p.id = c.creator_id
WHERE c.organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  AND c.is_published = true AND c.creator_id IS NOT NULL
ON CONFLICT (organization_id, creator_user_id) DO NOTHING;

-- ── RLS ──
ALTER TABLE public.organization_marketplace_creators ENABLE ROW LEVEL SECURITY;

CREATE POLICY omc_select_org_member ON public.organization_marketplace_creators
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_marketplace_creators.organization_id
      AND om.user_id = auth.uid()
  ));

CREATE POLICY omc_select_own ON public.organization_marketplace_creators
  FOR SELECT TO authenticated
  USING (creator_user_id = auth.uid());

CREATE POLICY omc_admin_insert ON public.organization_marketplace_creators
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY omc_admin_update ON public.organization_marketplace_creators
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY omc_admin_delete ON public.organization_marketplace_creators
  FOR DELETE TO authenticated
  USING (public.is_org_admin(organization_id));

-- ── RPC: user_ids del roster del marketplace de una org (valida membresía) ──
CREATE OR REPLACE FUNCTION public.get_org_marketplace_creator_ids(p_org_id uuid)
RETURNS TABLE (creator_user_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_org_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden: not a member of organization %', p_org_id;
  END IF;

  RETURN QUERY
  SELECT omc.creator_user_id
  FROM public.organization_marketplace_creators omc
  WHERE omc.organization_id = p_org_id
    AND omc.status = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_marketplace_creator_ids(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
