-- ============================================================================
-- KREOON — El pipeline gana dos paradas: el mercado y el creador
--
-- Spec: docs/MOTOR_INTELIGENCIA.md (R2 §5 y R3 §2).
--
-- Antes:  onboarding → adn → estrategia → guiones → produccion
-- Ahora:  onboarding → adn → mercado → estrategia → creadores → guiones → produccion
--
-- Por qué cada una:
--
--   · `mercado` — el motor de investigación produce el ADN de Mercado y el ADN
--     Viral del nicho. Son la carta de presentación de la agencia (el cliente
--     ve los anuncios reales de su competencia con "lleva 47 días corriendo")
--     y merecen su propia aprobación: si el cliente dice "esa no es mi
--     competencia", conviene enterarse ANTES de escribir la estrategia.
--
--   · `creadores` — el guion se escribe para la voz de una persona concreta.
--     Elegir al creador después de escribir los guiones obliga a reescribirlos
--     o, peor, a que alguien finja en cámara una vida que no es la suya.
--
-- Estado nuevo `awaiting_team`: la etapa de creadores NO la resuelve el
-- cliente sino el equipo (propone el sistema, confirma el humano). Sin este
-- estado, la etapa quedaría marcada como "esperando al cliente" y el portal le
-- pediría al cliente algo que no le toca.
--
-- Rollback:
--   Las dos etapas nuevas son opcionales: un run que ya pasó por ellas sigue
--   siendo válido. Para revertir, restaurar los CHECK anteriores tras mover a
--   'estrategia' los runs que estén en 'mercado' o 'creadores'.
-- ============================================================================

-- ---------------------------------------------------------------------
-- 1. Etapas y estados nuevos
-- ---------------------------------------------------------------------
ALTER TABLE public.client_pipeline_runs
  DROP CONSTRAINT IF EXISTS client_pipeline_runs_stage_check;
ALTER TABLE public.client_pipeline_runs
  ADD CONSTRAINT client_pipeline_runs_stage_check
  CHECK (stage IN ('onboarding','adn','mercado','estrategia','creadores','guiones','produccion'));

ALTER TABLE public.client_pipeline_runs
  DROP CONSTRAINT IF EXISTS client_pipeline_runs_stage_status_check;
ALTER TABLE public.client_pipeline_runs
  ADD CONSTRAINT client_pipeline_runs_stage_status_check
  CHECK (stage_status IN ('generating','awaiting_client','awaiting_team','changes_requested','approved','error','paused_no_tokens'));

ALTER TABLE public.client_pipeline_stage_events
  DROP CONSTRAINT IF EXISTS client_pipeline_stage_events_stage_check;
ALTER TABLE public.client_pipeline_stage_events
  ADD CONSTRAINT client_pipeline_stage_events_stage_check
  CHECK (stage IN ('onboarding','adn','mercado','estrategia','creadores','guiones','produccion'));

-- ---------------------------------------------------------------------
-- 2. Columnas de las etapas nuevas
-- ---------------------------------------------------------------------
ALTER TABLE public.client_pipeline_runs
  ADD COLUMN IF NOT EXISTS research_run_id        uuid,
  ADD COLUMN IF NOT EXISTS mercado_started_at     timestamptz,
  ADD COLUMN IF NOT EXISTS mercado_approved_at    timestamptz,
  ADD COLUMN IF NOT EXISTS creadores_started_at   timestamptz,
  ADD COLUMN IF NOT EXISTS creadores_approved_at  timestamptz,
  -- Los creadores confirmados por el equipo para este cliente. Sin FK, igual
  -- que client_dna_id: borrar un perfil no debe tumbar el run.
  ADD COLUMN IF NOT EXISTS selected_creator_ids   uuid[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.client_pipeline_runs.research_run_id IS
  'Corrida del motor de investigación (research_runs) que alimenta la etapa de mercado. Sin FK a propósito: la corrida se puede archivar sin tumbar el pipeline.';
COMMENT ON COLUMN public.client_pipeline_runs.selected_creator_ids IS
  'user_id de los creadores confirmados por el equipo. Los guiones se generan uno por creador, adaptados a su ficha creativa.';

-- ---------------------------------------------------------------------
-- 3. El cliente puede ver SU investigación (solo la suya, y solo leer)
--
-- El portal lee las tablas directo por RLS; sin esta política, las tarjetas
-- "Tu mercado" y "Lo que funciona en tu nicho" le llegarían vacías al cliente
-- aunque la investigación exista.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Client can view own research runs" ON public.research_runs;
CREATE POLICY "Client can view own research runs"
  ON public.research_runs FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT cu.client_id FROM public.client_users cu WHERE cu.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 4. Índice para la shortlist de creadores
--    La etapa 'creadores' filtra por creadores activos de la organización.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_client_pipeline_runs_selected_creators
  ON public.client_pipeline_runs USING gin (selected_creator_ids);

COMMENT ON TABLE public.client_pipeline_runs IS
  'Pipeline autónomo del cliente: onboarding → ADN → mercado → estrategia → creadores → guiones → producción. Una fila por cliente. Avanza solo entre etapas y se detiene en cada una esperando a quien le toque: al cliente casi siempre, al equipo en la elección de creador.';
