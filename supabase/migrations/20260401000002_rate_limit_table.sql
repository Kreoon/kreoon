-- ============================================================================
-- Migration: Rate Limit Table
-- Archivo:   20260401000002_rate_limit_table.sql
-- Proyecto:  KREOON
-- Descripcion: Tabla e infraestructura para rate limiting de Edge Functions.
--              La verificacion atomica ocurre via RPC check_rate_limit(),
--              llamada con service role desde supabase/functions/_shared/rate-limiter.ts
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabla principal
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT        NOT NULL,                       -- IP o user_id
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.rate_limits               IS 'Registro de requests para rate limiting en Edge Functions. Gestionado exclusivamente por service role.';
COMMENT ON COLUMN public.rate_limits.key           IS 'Identificador del caller: IP del cliente o user_id de Supabase Auth.';
COMMENT ON COLUMN public.rate_limits.window_start  IS 'Inicio de la ventana de tiempo a la que pertenece este registro.';

-- ----------------------------------------------------------------------------
-- Indices
-- ----------------------------------------------------------------------------

-- Indice principal: lookup atomico por clave dentro de una ventana
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window
  ON public.rate_limits (key, window_start);

-- Indice de limpieza periodica (pg_cron o cleanup manual)
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON public.rate_limits (window_start);

-- ----------------------------------------------------------------------------
-- RLS
-- Tabla accesible SOLO por service role (Edge Functions).
-- Usuarios autenticados y anonimos no tienen acceso directo.
-- ----------------------------------------------------------------------------

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Bloquear acceso directo a usuarios autenticados
CREATE POLICY "rate_limits_no_direct_user_access"
  ON public.rate_limits
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Bloquear acceso directo a usuarios anonimos
CREATE POLICY "rate_limits_no_anon_access"
  ON public.rate_limits
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ----------------------------------------------------------------------------
-- Funcion principal: verificacion y registro atomico
-- Llamada por service role desde rate-limiter.ts
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key          TEXT,
  p_limit        INT,
  p_window_start TIMESTAMPTZ
)
RETURNS TABLE (
  allowed       BOOLEAN,
  current_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- 1. Limpiar registros fuera de la ventana activa para mantener la tabla
  --    acotada. Solo borra entradas del mismo key para minimizar lock contention.
  DELETE FROM public.rate_limits
  WHERE key          = p_key
    AND window_start < p_window_start;

  -- 2. Contar requests del key dentro de la ventana actual
  SELECT COUNT(*)::INT
  INTO   v_count
  FROM   public.rate_limits
  WHERE  key          = p_key
    AND  window_start >= p_window_start;

  -- 3. Evaluar si la request esta permitida
  IF v_count >= p_limit THEN
    -- Limite superado: no insertar, retornar blocked
    allowed       := FALSE;
    current_count := v_count;
  ELSE
    -- Dentro del limite: registrar la request
    INSERT INTO public.rate_limits (key, window_start)
    VALUES (p_key, NOW());

    allowed       := TRUE;
    current_count := v_count + 1;
  END IF;

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.check_rate_limit(TEXT, INT, TIMESTAMPTZ) IS
  'Verifica y registra atomicamente una request para rate limiting. '
  'Retorna (allowed, current_count). Llamar con service role desde Edge Functions.';

-- Revocar ejecucion directa a roles publicos; solo service role puede llamarla
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, TIMESTAMPTZ) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, TIMESTAMPTZ) FROM authenticated;

-- ----------------------------------------------------------------------------
-- Funcion auxiliar: limpieza periodica global
-- Uso opcional con pg_cron:
--   SELECT cron.schedule('cleanup-rate-limits', '*/5 * * * *', 'SELECT public.cleanup_old_rate_limits()');
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits(
  p_max_age_minutes INT DEFAULT 60
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - (p_max_age_minutes || ' minutes')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_rate_limits(INT) IS
  'Elimina registros de rate_limits mas antiguos que p_max_age_minutes (default 60). '
  'Conectar con pg_cron para limpieza automatica periodica.';

REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits(INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits(INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits(INT) FROM authenticated;

-- ----------------------------------------------------------------------------
-- Trigger: updated_at automatico
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rate_limits_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rate_limits_updated_at
  BEFORE UPDATE ON public.rate_limits
  FOR EACH ROW EXECUTE FUNCTION public.rate_limits_set_updated_at();

-- ============================================================================
-- DOWN MIGRATION (para revertir manualmente si es necesario)
-- ============================================================================
--
-- DROP TRIGGER IF EXISTS trg_rate_limits_updated_at ON public.rate_limits;
-- DROP FUNCTION IF EXISTS public.rate_limits_set_updated_at();
-- DROP FUNCTION IF EXISTS public.cleanup_old_rate_limits(INT);
-- DROP FUNCTION IF EXISTS public.check_rate_limit(TEXT, INT, TIMESTAMPTZ);
-- DROP TABLE IF EXISTS public.rate_limits;
--
-- ============================================================================
