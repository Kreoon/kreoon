-- =====================================================
-- MIGRACIÓN: Cambiar "Ambassador" de ROL a INSIGNIA
-- =====================================================

-- 1. Crear tabla para insignias de miembros de organización
CREATE TABLE IF NOT EXISTS public.organization_member_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  badge text NOT NULL DEFAULT 'ambassador',
  level text DEFAULT 'bronze' CHECK (level IN ('bronze', 'silver', 'gold')),
  granted_at timestamp with time zone DEFAULT now(),
  granted_by uuid REFERENCES public.profiles(id),
  revoked_at timestamp with time zone,
  revoked_by uuid REFERENCES public.profiles(id),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, organization_id, badge)
);

-- 2. Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_member_badges_user ON public.organization_member_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_member_badges_org ON public.organization_member_badges(organization_id);
CREATE INDEX IF NOT EXISTS idx_member_badges_active ON public.organization_member_badges(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_member_badges_badge ON public.organization_member_badges(badge);

-- 3. Habilitar RLS
ALTER TABLE public.organization_member_badges ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de seguridad
-- Los miembros de la org pueden ver las insignias
CREATE POLICY "Org members can view badges"
  ON public.organization_member_badges
  FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

-- Solo admins pueden gestionar insignias
CREATE POLICY "Admins can manage badges"
  ON public.organization_member_badges
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN organization_member_roles omr ON om.user_id = omr.user_id AND om.organization_id = omr.organization_id
      WHERE om.organization_id = organization_member_badges.organization_id
      AND om.user_id = auth.uid()
      AND (omr.role = 'admin' OR om.is_owner = true)
    )
  );

-- 5. Migrar datos existentes de ambassador_level a la nueva tabla de badges
INSERT INTO public.organization_member_badges (user_id, organization_id, badge, level, granted_at, is_active)
SELECT 
  om.user_id,
  om.organization_id,
  'ambassador',
  om.ambassador_level,
  COALESCE(om.ambassador_since, now()),
  true
FROM public.organization_members om
WHERE om.ambassador_level IS NOT NULL 
  AND om.ambassador_level != 'none'
ON CONFLICT (user_id, organization_id, badge) DO NOTHING;

-- 6. Función helper para verificar si un usuario tiene una insignia activa
CREATE OR REPLACE FUNCTION public.has_badge(
  p_user_id uuid,
  p_organization_id uuid,
  p_badge text DEFAULT 'ambassador'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_member_badges
    WHERE user_id = p_user_id
      AND organization_id = p_organization_id
      AND badge = p_badge
      AND is_active = true
  );
$$;

-- 7. Función helper para obtener el nivel de una insignia
CREATE OR REPLACE FUNCTION public.get_badge_level(
  p_user_id uuid,
  p_organization_id uuid,
  p_badge text DEFAULT 'ambassador'
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT level FROM public.organization_member_badges
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND badge = p_badge
    AND is_active = true
  LIMIT 1;
$$;

-- 8. Función para otorgar una insignia
CREATE OR REPLACE FUNCTION public.grant_badge(
  p_user_id uuid,
  p_organization_id uuid,
  p_badge text,
  p_level text DEFAULT 'bronze',
  p_granted_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_badge_id uuid;
BEGIN
  INSERT INTO public.organization_member_badges (user_id, organization_id, badge, level, granted_by, is_active)
  VALUES (p_user_id, p_organization_id, p_badge, p_level, COALESCE(p_granted_by, auth.uid()), true)
  ON CONFLICT (user_id, organization_id, badge) 
  DO UPDATE SET 
    level = p_level,
    is_active = true,
    revoked_at = NULL,
    revoked_by = NULL,
    updated_at = now()
  RETURNING id INTO v_badge_id;
  
  RETURN v_badge_id;
END;
$$;

-- 9. Función para revocar una insignia
CREATE OR REPLACE FUNCTION public.revoke_badge(
  p_user_id uuid,
  p_organization_id uuid,
  p_badge text,
  p_revoked_by uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.organization_member_badges
  SET 
    is_active = false,
    revoked_at = now(),
    revoked_by = COALESCE(p_revoked_by, auth.uid()),
    updated_at = now()
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND badge = p_badge
    AND is_active = true;
  
  RETURN FOUND;
END;
$$;

-- 10. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_badge_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_organization_member_badges_updated_at
  BEFORE UPDATE ON public.organization_member_badges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_badge_updated_at();

-- 11. Habilitar realtime para la tabla de badges
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_member_badges;

-- 12. Actualizar la configuración de UP para embajadores
-- Agregar evento específico para contenido interno de embajadores
INSERT INTO public.ambassador_up_config (organization_id, event_key, event_name, description, base_points, is_active, conditions, multipliers)
SELECT 
  o.id,
  'internal_content_by_ambassador',
  'Contenido Interno de Marca',
  'Puntos otorgados cuando un embajador crea contenido interno para la organización',
  100,
  true,
  '{"approved": true, "client_is_organization": true}'::jsonb,
  '{"bronze": 1.0, "silver": 1.25, "gold": 1.5}'::jsonb
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.ambassador_up_config auc 
  WHERE auc.organization_id = o.id 
  AND auc.event_key = 'internal_content_by_ambassador'
);