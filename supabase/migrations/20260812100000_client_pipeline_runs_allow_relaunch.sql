-- ============================================================
-- FIX: permitir relanzar el pipeline de un cliente cuando el
-- proceso anterior ya terminó (produccion), sin perder histórico
-- ============================================================
-- HOY: client_pipeline_runs tiene UNIQUE (client_id) total → un
-- cliente que ya completó su proceso (stage='produccion') NUNCA puede
-- lanzar uno nuevo (ej: producto nuevo, relanzamiento un año después).
--
-- Estados válidos (CHECK ya existente en la tabla): 'onboarding',
-- 'adn', 'estrategia', 'guiones', 'produccion'. 'produccion' es el
-- estado terminal del pipeline (revisado supabase/functions/
-- pipeline-orchestrator/index.ts: no hay ninguna transición que saque
-- un run de 'produccion'). Se toma stage <> 'produccion' como
-- "run vivo" — mismo criterio que usó el team lead al pedir la tarea.
--
-- ⚠️ NO ES SOLO UN CAMBIO DE ÍNDICE — HAY QUE AVISAR AL EQUIPO ANTES
-- DE APLICAR ESTA MIGRACIÓN EN PRODUCCIÓN:
-- El UNIQUE(client_id) se usa HOY como mecanismo de IDEMPOTENCIA, no
-- solo como límite de negocio:
--   - supabase/functions/client-onboarding-process/index.ts línea
--     331-332 dice explícitamente: "`start` es idempotente (UNIQUE
--     por client_id), así que reprocesar el formulario no crea un
--     segundo run ni reinicia el vivo."
--   - supabase/functions/pipeline-orchestrator/index.ts líneas 1302,
--     1326, 1649 y 1689 hacen
--     `.from('client_pipeline_runs').select('*').eq('client_id', clientId).maybeSingle()`
--     (o por runId) SIN filtrar por stage ni ordenar — asumen que solo
--     puede existir UNA fila por client_id.
--   - src/hooks/useClientPipeline.ts línea 249-252 hace exactamente lo
--     mismo: `.eq('client_id', clientId).maybeSingle()`.
--
-- En cuanto un cliente tenga un run viejo en 'produccion' Y uno nuevo
-- "vivo" al mismo tiempo, esas 5 llamadas a maybeSingle() van a recibir
-- 2+ filas y PostgREST responde con error (maybeSingle exige 0 o 1
-- fila) — el hook del frontend y el orquestador se rompen para ese
-- cliente.
--
-- Esta migración SOLO cambia el constraint de base de datos. El código
-- de pipeline-orchestrator, client-onboarding-process y
-- useClientPipeline.ts DEBE actualizarse (filtrar `stage <> 'produccion'`
-- o `order by created_at desc limit 1`) en el mismo despliegue que esta
-- migración — si no, el primer relanzamiento real rompe esas 3 rutas.
-- NO se toca ese código aquí (está fuera de mi alcance: solo
-- supabase/migrations/). Reportado en fix_seguridad.md para que el
-- team lead lo asigne a quien corresponda antes de aplicar.
-- ============================================================

-- 1. Quitar el UNIQUE total por client_id.
ALTER TABLE public.client_pipeline_runs
  DROP CONSTRAINT client_pipeline_runs_client_unique;

-- 2. Único índice parcial: solo puede haber UN run "vivo"
--    (stage <> 'produccion') por cliente a la vez. Los runs ya
--    terminados (produccion) se conservan como histórico, sin
--    restricción de unicidad entre ellos.
CREATE UNIQUE INDEX client_pipeline_runs_one_live_per_client
  ON public.client_pipeline_runs (client_id)
  WHERE (stage <> 'produccion');

COMMENT ON INDEX public.client_pipeline_runs_one_live_per_client IS
  'Reemplaza al UNIQUE(client_id) total: permite relanzar el pipeline '
  'de un cliente una vez que su run anterior llegó a stage=produccion, '
  'conservando el histórico. Ver comentario de cabecera de esta '
  'migración: hay código en pipeline-orchestrator, '
  'client-onboarding-process y useClientPipeline.ts que asume una sola '
  'fila por client_id y debe actualizarse antes de que esto tenga efecto.';
