-- Fusión Kreoon × UGC Colombia
-- Esta migración NO elimina datos. Solo actualiza metadatos de la organización.
-- Preserva: miembros, contenido, campañas, proyectos, archivos y configuraciones.

-- 1. Columna para marcar la agencia interna oficial de Kreoon
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_official_agency BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.organizations.is_official_agency
  IS 'Agencia interna oficial de Kreoon (Kreoon by UGC Colombia)';

-- 2. Renombrar y elevar a enterprise la organización UGC Colombia (slug único: ugc-colombia)
UPDATE public.organizations
SET
  name               = 'Kreoon by UGC Colombia',
  selected_plan      = 'enterprise',
  is_official_agency = true
WHERE slug = 'ugc-colombia';

-- 3. Actualizar partner_community (renombra badge, conserva beneficios)
UPDATE public.partner_communities
SET
  name              = 'Kreoon by UGC Colombia',
  custom_badge_text = 'Kreoon by UGC Colombia'
WHERE slug = 'ugc-colombia';
