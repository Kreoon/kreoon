-- =====================================================
-- FIX UP POINTS SYSTEM
-- Soluciona:
-- 1. Tablas de totales vacías (triggers eliminados)
-- 2. Temporadas que no se cierran automáticamente
-- 3. Sincronización entre sistema UP antiguo y nuevo
-- =====================================================

-- ═══════════════════════════════════════════════════
-- 1. RECREAR TABLAS DE TOTALES SI NO EXISTEN
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.up_creadores_totals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  on_time_deliveries INTEGER NOT NULL DEFAULT 0,
  late_deliveries INTEGER NOT NULL DEFAULT 0,
  total_issues INTEGER NOT NULL DEFAULT 0,
  clean_approvals INTEGER NOT NULL DEFAULT 0,
  reassignments INTEGER NOT NULL DEFAULT 0,
  current_level TEXT NOT NULL DEFAULT 'bronze',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT up_creadores_totals_user_org_unique UNIQUE (user_id, organization_id)
);

CREATE TABLE IF NOT EXISTS public.up_editores_totals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  on_time_deliveries INTEGER NOT NULL DEFAULT 0,
  late_deliveries INTEGER NOT NULL DEFAULT 0,
  total_issues INTEGER NOT NULL DEFAULT 0,
  clean_approvals INTEGER NOT NULL DEFAULT 0,
  reassignments INTEGER NOT NULL DEFAULT 0,
  current_level TEXT NOT NULL DEFAULT 'bronze',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT up_editores_totals_user_org_unique UNIQUE (user_id, organization_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_up_creadores_totals_user ON public.up_creadores_totals(user_id);
CREATE INDEX IF NOT EXISTS idx_up_creadores_totals_org ON public.up_creadores_totals(organization_id);
CREATE INDEX IF NOT EXISTS idx_up_editores_totals_user ON public.up_editores_totals(user_id);
CREATE INDEX IF NOT EXISTS idx_up_editores_totals_org ON public.up_editores_totals(organization_id);

-- Agregar constraints UNIQUE si no existen (para tablas que ya existían)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'up_creadores_totals_user_org_unique'
  ) THEN
    -- Limpiar duplicados primero
    DELETE FROM public.up_creadores_totals a
    USING public.up_creadores_totals b
    WHERE a.id < b.id
      AND a.user_id = b.user_id
      AND a.organization_id = b.organization_id;

    ALTER TABLE public.up_creadores_totals
    ADD CONSTRAINT up_creadores_totals_user_org_unique UNIQUE (user_id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'up_editores_totals_user_org_unique'
  ) THEN
    -- Limpiar duplicados primero
    DELETE FROM public.up_editores_totals a
    USING public.up_editores_totals b
    WHERE a.id < b.id
      AND a.user_id = b.user_id
      AND a.organization_id = b.organization_id;

    ALTER TABLE public.up_editores_totals
    ADD CONSTRAINT up_editores_totals_user_org_unique UNIQUE (user_id, organization_id);
  END IF;
END $$;

-- RLS
ALTER TABLE public.up_creadores_totals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.up_editores_totals ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura
DROP POLICY IF EXISTS "Users view own creator totals" ON public.up_creadores_totals;
CREATE POLICY "Users view own creator totals" ON public.up_creadores_totals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all creator totals" ON public.up_creadores_totals;
CREATE POLICY "Admins view all creator totals" ON public.up_creadores_totals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = up_creadores_totals.organization_id
      AND om.role IN ('admin', 'team_leader')
    )
  );

DROP POLICY IF EXISTS "Users view own editor totals" ON public.up_editores_totals;
CREATE POLICY "Users view own editor totals" ON public.up_editores_totals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all editor totals" ON public.up_editores_totals;
CREATE POLICY "Admins view all editor totals" ON public.up_editores_totals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = up_editores_totals.organization_id
      AND om.role IN ('admin', 'team_leader')
    )
  );

-- ═══════════════════════════════════════════════════
-- 2. FUNCIÓN PARA CALCULAR NIVEL
-- ═══════════════════════════════════════════════════

-- Drop existing function to avoid parameter name conflict
DROP FUNCTION IF EXISTS public.calculate_up_level(INTEGER);

CREATE OR REPLACE FUNCTION public.calculate_up_level(p_points INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_points >= 15000 THEN RETURN 'legend';
  ELSIF p_points >= 5000 THEN RETURN 'master';
  ELSIF p_points >= 2000 THEN RETURN 'elite';
  ELSIF p_points >= 500 THEN RETURN 'pro';
  ELSE RETURN 'bronze';
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════
-- 3. FUNCIÓN PARA ACTUALIZAR TOTALES DE CREADORES
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_up_creadores_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_points INTEGER;
  v_total_deliveries INTEGER;
  v_on_time INTEGER;
  v_late INTEGER;
  v_issues INTEGER;
  v_clean INTEGER;
  v_reassignments INTEGER;
  v_level TEXT;
BEGIN
  -- Calcular totales para el usuario
  SELECT
    COALESCE(SUM(points), 0),
    COUNT(*) FILTER (WHERE event_type IN ('delivery', 'on_time_delivery', 'late_delivery')),
    COUNT(*) FILTER (WHERE event_type = 'on_time_delivery'),
    COUNT(*) FILTER (WHERE event_type = 'late_delivery'),
    COUNT(*) FILTER (WHERE event_type = 'issue'),
    COUNT(*) FILTER (WHERE event_type = 'clean_approval'),
    COUNT(*) FILTER (WHERE event_type = 'reassignment')
  INTO v_total_points, v_total_deliveries, v_on_time, v_late, v_issues, v_clean, v_reassignments
  FROM public.up_creadores
  WHERE user_id = NEW.user_id
    AND organization_id = NEW.organization_id;

  v_level := public.calculate_up_level(v_total_points);

  -- Upsert en totales
  INSERT INTO public.up_creadores_totals (
    user_id, organization_id, total_points, total_deliveries,
    on_time_deliveries, late_deliveries, total_issues,
    clean_approvals, reassignments, current_level, updated_at
  ) VALUES (
    NEW.user_id, NEW.organization_id, v_total_points, v_total_deliveries,
    v_on_time, v_late, v_issues, v_clean, v_reassignments, v_level, now()
  )
  ON CONFLICT (user_id, organization_id) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    total_deliveries = EXCLUDED.total_deliveries,
    on_time_deliveries = EXCLUDED.on_time_deliveries,
    late_deliveries = EXCLUDED.late_deliveries,
    total_issues = EXCLUDED.total_issues,
    clean_approvals = EXCLUDED.clean_approvals,
    reassignments = EXCLUDED.reassignments,
    current_level = EXCLUDED.current_level,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════
-- 4. FUNCIÓN PARA ACTUALIZAR TOTALES DE EDITORES
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_up_editores_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_points INTEGER;
  v_total_deliveries INTEGER;
  v_on_time INTEGER;
  v_late INTEGER;
  v_issues INTEGER;
  v_clean INTEGER;
  v_reassignments INTEGER;
  v_level TEXT;
BEGIN
  -- Calcular totales para el usuario
  SELECT
    COALESCE(SUM(points), 0),
    COUNT(*) FILTER (WHERE event_type IN ('delivery', 'on_time_delivery', 'late_delivery')),
    COUNT(*) FILTER (WHERE event_type = 'on_time_delivery'),
    COUNT(*) FILTER (WHERE event_type = 'late_delivery'),
    COUNT(*) FILTER (WHERE event_type = 'issue'),
    COUNT(*) FILTER (WHERE event_type = 'clean_approval'),
    COUNT(*) FILTER (WHERE event_type = 'reassignment')
  INTO v_total_points, v_total_deliveries, v_on_time, v_late, v_issues, v_clean, v_reassignments
  FROM public.up_editores
  WHERE user_id = NEW.user_id
    AND organization_id = NEW.organization_id;

  v_level := public.calculate_up_level(v_total_points);

  -- Upsert en totales
  INSERT INTO public.up_editores_totals (
    user_id, organization_id, total_points, total_deliveries,
    on_time_deliveries, late_deliveries, total_issues,
    clean_approvals, reassignments, current_level, updated_at
  ) VALUES (
    NEW.user_id, NEW.organization_id, v_total_points, v_total_deliveries,
    v_on_time, v_late, v_issues, v_clean, v_reassignments, v_level, now()
  )
  ON CONFLICT (user_id, organization_id) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    total_deliveries = EXCLUDED.total_deliveries,
    on_time_deliveries = EXCLUDED.on_time_deliveries,
    late_deliveries = EXCLUDED.late_deliveries,
    total_issues = EXCLUDED.total_issues,
    clean_approvals = EXCLUDED.clean_approvals,
    reassignments = EXCLUDED.reassignments,
    current_level = EXCLUDED.current_level,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════
-- 5. CREAR TRIGGERS
-- ═══════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trigger_update_up_creadores_totals ON public.up_creadores;
CREATE TRIGGER trigger_update_up_creadores_totals
  AFTER INSERT OR UPDATE ON public.up_creadores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_up_creadores_totals();

DROP TRIGGER IF EXISTS trigger_update_up_editores_totals ON public.up_editores;
CREATE TRIGGER trigger_update_up_editores_totals
  AFTER INSERT OR UPDATE ON public.up_editores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_up_editores_totals();

-- ═══════════════════════════════════════════════════
-- 6. POBLAR TOTALES CON DATOS EXISTENTES
-- ═══════════════════════════════════════════════════

-- Poblar up_creadores_totals
INSERT INTO public.up_creadores_totals (
  user_id, organization_id, total_points, total_deliveries,
  on_time_deliveries, late_deliveries, total_issues,
  clean_approvals, reassignments, current_level, updated_at
)
SELECT
  user_id,
  organization_id,
  COALESCE(SUM(points), 0) as total_points,
  COUNT(*) FILTER (WHERE event_type IN ('delivery', 'on_time_delivery', 'late_delivery')) as total_deliveries,
  COUNT(*) FILTER (WHERE event_type = 'on_time_delivery') as on_time_deliveries,
  COUNT(*) FILTER (WHERE event_type = 'late_delivery') as late_deliveries,
  COUNT(*) FILTER (WHERE event_type = 'issue') as total_issues,
  COUNT(*) FILTER (WHERE event_type = 'clean_approval') as clean_approvals,
  COUNT(*) FILTER (WHERE event_type = 'reassignment') as reassignments,
  public.calculate_up_level(COALESCE(SUM(points), 0)::INTEGER) as current_level,
  now() as updated_at
FROM public.up_creadores
GROUP BY user_id, organization_id
ON CONFLICT (user_id, organization_id) DO UPDATE SET
  total_points = EXCLUDED.total_points,
  total_deliveries = EXCLUDED.total_deliveries,
  on_time_deliveries = EXCLUDED.on_time_deliveries,
  late_deliveries = EXCLUDED.late_deliveries,
  total_issues = EXCLUDED.total_issues,
  clean_approvals = EXCLUDED.clean_approvals,
  reassignments = EXCLUDED.reassignments,
  current_level = EXCLUDED.current_level,
  updated_at = now();

-- Poblar up_editores_totals
INSERT INTO public.up_editores_totals (
  user_id, organization_id, total_points, total_deliveries,
  on_time_deliveries, late_deliveries, total_issues,
  clean_approvals, reassignments, current_level, updated_at
)
SELECT
  user_id,
  organization_id,
  COALESCE(SUM(points), 0) as total_points,
  COUNT(*) FILTER (WHERE event_type IN ('delivery', 'on_time_delivery', 'late_delivery')) as total_deliveries,
  COUNT(*) FILTER (WHERE event_type = 'on_time_delivery') as on_time_deliveries,
  COUNT(*) FILTER (WHERE event_type = 'late_delivery') as late_deliveries,
  COUNT(*) FILTER (WHERE event_type = 'issue') as total_issues,
  COUNT(*) FILTER (WHERE event_type = 'clean_approval') as clean_approvals,
  COUNT(*) FILTER (WHERE event_type = 'reassignment') as reassignments,
  public.calculate_up_level(COALESCE(SUM(points), 0)::INTEGER) as current_level,
  now() as updated_at
FROM public.up_editores
GROUP BY user_id, organization_id
ON CONFLICT (user_id, organization_id) DO UPDATE SET
  total_points = EXCLUDED.total_points,
  total_deliveries = EXCLUDED.total_deliveries,
  on_time_deliveries = EXCLUDED.on_time_deliveries,
  late_deliveries = EXCLUDED.late_deliveries,
  total_issues = EXCLUDED.total_issues,
  clean_approvals = EXCLUDED.clean_approvals,
  reassignments = EXCLUDED.reassignments,
  current_level = EXCLUDED.current_level,
  updated_at = now();

-- ═══════════════════════════════════════════════════
-- 7. FUNCIÓN PARA CERRAR TEMPORADAS EXPIRADAS
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.close_expired_seasons()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_closed_count INTEGER := 0;
  v_season RECORD;
  v_snapshot_count INTEGER := 0;
BEGIN
  -- Buscar temporadas activas que ya expiraron
  FOR v_season IN
    SELECT id, organization_id, name, ends_at
    FROM public.up_seasons
    WHERE is_active = true
      AND ends_at IS NOT NULL
      AND ends_at < (now() AT TIME ZONE 'America/Bogota')
  LOOP
    -- Crear snapshots para creadores
    INSERT INTO public.up_season_snapshots (
      season_id, user_id, user_type, final_points, final_level,
      final_rank, total_events, achievements_unlocked, organization_id
    )
    SELECT
      v_season.id,
      user_id,
      'creator',
      total_points,
      current_level,
      ROW_NUMBER() OVER (ORDER BY total_points DESC),
      total_deliveries,
      0,
      organization_id
    FROM public.up_creadores_totals
    WHERE organization_id = v_season.organization_id
      AND total_points > 0;

    GET DIAGNOSTICS v_snapshot_count = ROW_COUNT;

    -- Crear snapshots para editores
    INSERT INTO public.up_season_snapshots (
      season_id, user_id, user_type, final_points, final_level,
      final_rank, total_events, achievements_unlocked, organization_id
    )
    SELECT
      v_season.id,
      user_id,
      'editor',
      total_points,
      current_level,
      ROW_NUMBER() OVER (ORDER BY total_points DESC),
      total_deliveries,
      0,
      organization_id
    FROM public.up_editores_totals
    WHERE organization_id = v_season.organization_id
      AND total_points > 0;

    -- Cerrar la temporada
    UPDATE public.up_seasons
    SET is_active = false
    WHERE id = v_season.id;

    v_closed_count := v_closed_count + 1;

    RAISE NOTICE 'Cerrada temporada: % (%) con % snapshots', v_season.name, v_season.id, v_snapshot_count;
  END LOOP;

  -- También cerrar temporadas en el nuevo sistema (reputation_seasons)
  UPDATE public.reputation_seasons
  SET is_active = false
  WHERE is_active = true
    AND end_date < CURRENT_DATE;

  RETURN jsonb_build_object(
    'success', true,
    'seasons_closed', v_closed_count,
    'message', format('%s temporada(s) cerrada(s)', v_closed_count)
  );
END;
$$;

-- ═══════════════════════════════════════════════════
-- 8. FUNCIÓN RPC PARA CERRAR TEMPORADA MANUALMENTE
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.close_season_manually(p_season_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_season RECORD;
  v_snapshot_count INTEGER := 0;
BEGIN
  -- Verificar que la temporada existe y está activa
  SELECT id, organization_id, name
  INTO v_season
  FROM public.up_seasons
  WHERE id = p_season_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Temporada no encontrada o ya cerrada');
  END IF;

  -- Crear snapshots para creadores
  INSERT INTO public.up_season_snapshots (
    season_id, user_id, user_type, final_points, final_level,
    final_rank, total_events, achievements_unlocked, organization_id
  )
  SELECT
    v_season.id,
    user_id,
    'creator',
    total_points,
    current_level,
    ROW_NUMBER() OVER (ORDER BY total_points DESC),
    total_deliveries,
    0,
    organization_id
  FROM public.up_creadores_totals
  WHERE organization_id = v_season.organization_id
    AND total_points > 0;

  GET DIAGNOSTICS v_snapshot_count = ROW_COUNT;

  -- Crear snapshots para editores
  INSERT INTO public.up_season_snapshots (
    season_id, user_id, user_type, final_points, final_level,
    final_rank, total_events, achievements_unlocked, organization_id
  )
  SELECT
    v_season.id,
    user_id,
    'editor',
    total_points,
    current_level,
    ROW_NUMBER() OVER (ORDER BY total_points DESC),
    total_deliveries,
    0,
    organization_id
  FROM public.up_editores_totals
  WHERE organization_id = v_season.organization_id
    AND total_points > 0;

  -- Cerrar la temporada
  UPDATE public.up_seasons
  SET is_active = false
  WHERE id = p_season_id;

  RETURN jsonb_build_object(
    'success', true,
    'season_name', v_season.name,
    'snapshots_created', v_snapshot_count,
    'message', format('Temporada "%s" cerrada con %s snapshots', v_season.name, v_snapshot_count)
  );
END;
$$;

-- ═══════════════════════════════════════════════════
-- 9. FUNCIÓN RPC PARA OBTENER ESTADÍSTICAS DE PAPELERA
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_trash_stats(p_organization_id UUID DEFAULT NULL)
RETURNS TABLE (
  table_name TEXT,
  item_count BIGINT,
  oldest_item TIMESTAMPTZ,
  newest_item TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pb.table_name::TEXT,
    COUNT(*)::BIGINT as item_count,
    MIN(pb.backed_up_at) as oldest_item,
    MAX(pb.backed_up_at) as newest_item
  FROM public.platform_backup pb
  WHERE pb.restored_at IS NULL
    AND pb.backup_type IN ('soft_delete', 'hard_delete')
    AND (p_organization_id IS NULL OR pb.organization_id = p_organization_id OR pb.organization_id IS NULL)
  GROUP BY pb.table_name
  ORDER BY item_count DESC;
END;
$$;

-- ═══════════════════════════════════════════════════
-- 10. EJECUTAR CIERRE DE TEMPORADAS EXPIRADAS AHORA
-- ═══════════════════════════════════════════════════

SELECT public.close_expired_seasons();

-- ═══════════════════════════════════════════════════
-- 11. GRANTS
-- ═══════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.close_expired_seasons() TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_season_manually(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trash_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_up_level(INTEGER) TO authenticated;

GRANT SELECT ON public.up_creadores_totals TO authenticated;
GRANT SELECT ON public.up_editores_totals TO authenticated;
