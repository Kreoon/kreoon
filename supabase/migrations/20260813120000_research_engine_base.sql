-- ============================================================================
-- KREOON — Motor de investigacion real (Apify + Perplexity). Base de datos.
-- Spec: docs/MOTOR_INTELIGENCIA.md (PROMPT R1, tanda 1: etapas A / C / E).
--
-- Dos tablas con dueños distintos a proposito:
--
--   research_runs        — una corrida por cliente. Datos DE UN CLIENTE, por
--                          tanto aislada por organizacion como todo lo demas.
--   niche_intelligence   — inteligencia de NICHO (que funciona en "belleza
--                          capilar Colombia"). No lleva datos de ningun
--                          cliente, es un activo de plataforma: lo que
--                          aprendemos con el cliente #1 abarata al cliente #2.
--                          Por eso se lee desde cualquier organizacion y solo
--                          la escribe el service_role.
--
-- Rollback:
--   DROP TABLE public.research_runs CASCADE;
--   DROP TABLE public.niche_intelligence CASCADE;
-- ============================================================================

-- ============================================================
-- research_runs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.research_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  -- Nullable a proposito: el motor se puede correr suelto (validacion, refresh
  -- de nicho, re-investigacion pedida por el equipo) sin que exista un run del
  -- pipeline autonomo detras.
  pipeline_run_id uuid REFERENCES public.client_pipeline_runs(id) ON DELETE SET NULL,

  niche           text,
  country         text,

  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'running', 'partial', 'done', 'error')),

  -- Progreso por etapa A–G del spec. Forma:
  --   { "A": { "status": "done", "started_at": ..., "finished_at": ...,
  --            "cost_usd": 0.15, "detail": {...} }, ... }
  -- Cada etapa es idempotente: si ya esta 'done' no se vuelve a correr.
  stage           jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- TODOS los runs de Apify de la corrida: { "A_ig_profile": "<runId>", ... }.
  -- Guardarlos permite re-leer un dataset sin volver a pagar el scrape, que es
  -- justo lo que salva una corrida cuando un actor devuelve lotes incompletos.
  apify_run_ids   jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Resultado acumulado de las etapas ya corridas (perfiles, posts proyectados,
  -- ranking de viralidad). No esta en la spec original de la tabla, pero sin el
  -- las etapas A/C/E no tendrian donde dejar su salida hasta que exista la
  -- etapa G (sintesis de los 4 ADNs), que llega en la tanda 2.
  result          jsonb NOT NULL DEFAULT '{}'::jsonb,

  cost_usd        numeric(10,4) NOT NULL DEFAULT 0,
  -- Techo duro por corrida. Al alcanzarlo la corrida queda 'partial' con lo
  -- obtenido: nunca gasto sin techo, nunca corrida colgada.
  budget_usd      numeric(10,4) NOT NULL DEFAULT 6,

  error_log       jsonb NOT NULL DEFAULT '[]'::jsonb,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_research_runs_org
  ON public.research_runs (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_research_runs_client
  ON public.research_runs (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_runs_pipeline
  ON public.research_runs (pipeline_run_id)
  WHERE pipeline_run_id IS NOT NULL;

CREATE OR REPLACE TRIGGER set_updated_at_research_runs
  BEFORE UPDATE ON public.research_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- niche_intelligence
-- ============================================================
CREATE TABLE IF NOT EXISTS public.niche_intelligence (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche                   text NOT NULL,
  country                 text NOT NULL,

  -- Los tres productos reutilizables entre clientes del mismo nicho+pais.
  -- Se llenan en la tanda 2 (etapas B, D, G); aqui nacen vacios.
  adn_viral               jsonb NOT NULL DEFAULT '{}'::jsonb,
  market_ads              jsonb NOT NULL DEFAULT '{}'::jsonb,
  discovered_competitors  jsonb NOT NULL DEFAULT '[]'::jsonb,

  source_run_id           uuid REFERENCES public.research_runs(id) ON DELETE SET NULL,

  -- El motor reutiliza la fila si tiene menos de 30 dias; si no, la refresca.
  refreshed_at            timestamptz NOT NULL DEFAULT now(),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT niche_intelligence_niche_country_key UNIQUE (niche, country)
);

CREATE INDEX IF NOT EXISTS idx_niche_intelligence_refreshed
  ON public.niche_intelligence (refreshed_at DESC);

CREATE OR REPLACE TRIGGER set_updated_at_niche_intelligence
  BEFORE UPDATE ON public.niche_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.research_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niche_intelligence ENABLE ROW LEVEL SECURITY;

-- research_runs: mismo predicado org-staff que client_onboarding_forms, con la
-- misma desviacion deliberada (se incluyen 'digital_strategist' y
-- 'creative_strategist' porque en produccion 'team_leader' y 'strategist' no
-- tienen ni una fila y dejarlos solos cerraria la tabla a los estrategas
-- reales).
DROP POLICY IF EXISTS "Org staff can manage research runs" ON public.research_runs;
CREATE POLICY "Org staff can manage research runs"
  ON public.research_runs
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role = ANY (ARRAY[
          'admin'::app_role,
          'team_leader'::app_role,
          'strategist'::app_role,
          'digital_strategist'::app_role,
          'creative_strategist'::app_role
        ])
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role = ANY (ARRAY[
          'admin'::app_role,
          'team_leader'::app_role,
          'strategist'::app_role,
          'digital_strategist'::app_role,
          'creative_strategist'::app_role
        ])
    )
  );

-- niche_intelligence: lectura para cualquier usuario autenticado (es
-- inteligencia de plataforma, sin datos de clientes). Escritura: NINGUNA
-- politica para authenticated -> solo entra por service_role, que salta RLS.
DROP POLICY IF EXISTS "Authenticated can read niche intelligence" ON public.niche_intelligence;
CREATE POLICY "Authenticated can read niche intelligence"
  ON public.niche_intelligence
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- GRANTS
-- Explicitos aunque exista ALTER DEFAULT PRIVILEGES: el incidente de las 30
-- tablas academy_* (service_role -> "permission denied" -> 500 silencioso)
-- salio de confiar en el default.
-- ============================================================
GRANT ALL ON public.research_runs TO service_role;
GRANT ALL ON public.niche_intelligence TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_runs TO authenticated;
GRANT SELECT ON public.niche_intelligence TO authenticated;

-- ============================================================
-- Documentacion
-- ============================================================
COMMENT ON TABLE public.research_runs IS
  'Una corrida del motor de investigacion (docs/MOTOR_INTELIGENCIA.md) para un cliente. Etapas A-G en la columna `stage`, cada una idempotente y re-ejecutable. `apify_run_ids` guarda todos los runs de Apify para poder re-leer datasets sin volver a pagar el scrape. `budget_usd` es un techo duro: al alcanzarlo la corrida termina en status `partial` con lo que alcanzo a obtener.';

COMMENT ON TABLE public.niche_intelligence IS
  'Inteligencia por nicho+pais compartida entre TODAS las organizaciones: que hooks/ads/competidores funcionan en ese nicho. NO contiene datos de clientes. Se reutiliza si `refreshed_at` tiene menos de 30 dias, lo que permite saltar las etapas B y D del motor y abaratar cada cliente nuevo. Lectura: cualquier authenticated. Escritura: solo service_role.';

COMMENT ON COLUMN public.research_runs.stage IS
  'Progreso por etapa: { "A": { "status": "pending|running|done|error|skipped", "started_at", "finished_at", "cost_usd", "detail" }, ... }. Etapas: A linea base propia, B descubrimiento de competidores, C scrape de competidores, D ads del gremio, E ranking de viralidad, F transcripcion del top, G sintesis de los 4 ADNs.';

COMMENT ON COLUMN public.research_runs.result IS
  'Salida acumulada: { "own": {...}, "competitors": [...], "ranking": [...] }. Las transcripciones y los 4 ADNs se agregan en la tanda 2.';
