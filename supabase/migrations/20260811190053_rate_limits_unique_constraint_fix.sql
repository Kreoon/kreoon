-- ============================================================================
-- FIX: check_rate_limit siempre lanzaba excepcion -> rate limiting era un no-op
-- ============================================================================
-- Fecha: 2026-08-11
--
-- La funcion public.check_rate_limit hace:
--   INSERT INTO public.rate_limits (identifier, identifier_type, action_type)
--   ... ON CONFLICT (identifier, identifier_type, action_type) DO UPDATE ...
-- pero rate_limits nunca tuvo una constraint UNIQUE sobre esa tripleta, asi que
-- Postgres respondia:
--   42P10: there is no unique or exclusion constraint matching the ON CONFLICT
-- en CADA llamada. Sintoma corroborante: la tabla rate_limits acumulo 0 filas
-- historicas pese a que content-ai "limita" cada request desde hace meses.
--
-- Nota: son DOS bugs independientes, este arregla solo el segundo.
--   1. _shared/rate-limiter.ts llama la RPC con {p_key, p_limit, p_window_start}
--      pero la firma real es (_identifier, _identifier_type, _action_type,
--      _max_attempts, _window_minutes, _block_minutes). PostgREST no resuelve la
--      funcion -> el wrapper cae en su rama fail-open. NO se toca aqui.
--   2. Aun llamando con la firma correcta, la RPC lanzaba 42P10. Esto es lo que
--      se arregla.
--
-- Impacto: solo se activa el rate limiting para los callers que ya invocan la
-- RPC con la firma correcta (hoy: client-onboarding-get / client-onboarding-submit).
-- content-ai y demas siguen con el bug 1 y por lo tanto sin cambio de
-- comportamiento: este fix NO empieza a bloquear trafico existente.
--
-- Seguro de aplicar: la tabla estaba vacia, la constraint no puede fallar por
-- duplicados preexistentes.
--
-- Rollback:
--   ALTER TABLE public.rate_limits DROP CONSTRAINT rate_limits_identifier_action_key;
-- ============================================================================

ALTER TABLE public.rate_limits
  ADD CONSTRAINT rate_limits_identifier_action_key
  UNIQUE (identifier, identifier_type, action_type);

COMMENT ON CONSTRAINT rate_limits_identifier_action_key ON public.rate_limits IS
  'Requerida por el ON CONFLICT de check_rate_limit(). Sin ella la funcion lanza 42P10 en cada llamada y el rate limiting queda inoperante.';

NOTIFY pgrst, 'reload schema';
