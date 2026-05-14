-- =====================================================
-- Auto-aprobación de contenido sin respuesta del cliente
-- Regla: si el video está en "entregado" y el cliente
-- no aprueba en X días → se aprueba automáticamente
-- y se registra nota de sistema en content_history.
-- X = organizations.content_auto_approve_days (default 5)
-- NULL en esa columna = regla desactivada para esa org
-- =====================================================

-- 1. Columna de configuración por organización
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS content_auto_approve_days INTEGER DEFAULT 5;

COMMENT ON COLUMN public.organizations.content_auto_approve_days IS
  'Días en estado "entregado" sin respuesta del cliente antes de aprobar automáticamente. NULL = desactivado.';

-- 2. Función principal
CREATE OR REPLACE FUNCTION public.auto_approve_stale_content()
RETURNS INTEGER   -- retorna cantidad de piezas procesadas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  WITH stale AS (
    -- Selecciona contenido entregado que superó el umbral de días
    SELECT c.id AS content_id, c.organization_id
    FROM   public.content c
    JOIN   public.organizations o ON o.id = c.organization_id
    WHERE  c.status        = 'delivered'
      AND  c.delivered_at  IS NOT NULL
      AND  o.content_auto_approve_days IS NOT NULL
      AND  c.delivered_at <= NOW() - (o.content_auto_approve_days || ' days')::interval
  ),
  updated AS (
    UPDATE public.content c
    SET
      status      = 'approved',
      approved_at = NOW(),
      updated_at  = NOW()
    FROM stale s
    WHERE c.id = s.content_id
    RETURNING c.id AS content_id, c.organization_id
  ),
  history AS (
    INSERT INTO public.content_history
      (content_id, user_id, old_status, new_status, notes)
    SELECT
      u.content_id,
      NULL,   -- nota de sistema, sin usuario
      'delivered'::public.content_status,
      'approved'::public.content_status,
      'Aprobado por sistema. El cliente no respondió dentro del tiempo establecido.'
    FROM updated u
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_approve_stale_content() TO authenticated;

COMMENT ON FUNCTION public.auto_approve_stale_content() IS
  'Aprueba automáticamente el contenido en estado "entregado" que superó el umbral de días configurado en organizations.content_auto_approve_days. Registra nota de sistema en content_history.';

-- 3. Cron job diario a las 06:00 UTC (01:00 Colombia)
--    Se ejecuta aunque la extensión ya esté activa — upsert por nombre
SELECT cron.schedule(
  'auto-approve-stale-content',   -- nombre único
  '0 6 * * *',                    -- 06:00 UTC todos los días
  $$ SELECT public.auto_approve_stale_content(); $$
);
