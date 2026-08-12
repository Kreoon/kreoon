-- =====================================================================
-- Pipeline autónomo del cliente: onboarding → ADN → estrategia → guiones
-- Bloque 1 de 4: máquina de estados
-- =====================================================================
--
-- Un "run" es el viaje de UN cliente desde que envía el formulario de
-- onboarding hasta que sus guiones quedan aprobados y entran al board.
--
-- El run AVANZA SOLO entre etapas, pero se DETIENE en cada una esperando
-- al cliente: stage_status = 'awaiting_client'. Solo su aprobación mueve
-- el run a la siguiente etapa.
--
-- Decisiones de diseño y por qué:
--
--  · `stage` y `stage_status` son TEXT con CHECK, no enums. Añadir un valor
--    a un enum de Postgres es una migración con bloqueo; aquí vamos a
--    iterar sobre los estados mientras se afina el flujo.
--
--  · `product_id` es nullable: al crear el run todavía no existe el
--    producto. Lo crea `generate-product-dna` (que INSERTA en `products`
--    de forma incondicional — llamarla dos veces crea dos productos, de
--    ahí que el orquestador guarde aquí el id para no repetir).
--
--  · `stage_attempts` es jsonb {etapa: nº} en vez de una columna por
--    etapa: el límite de 3 regeneraciones se aplica por etapa y así no
--    hace falta una migración para añadir etapas.
--
--  · El histórico vive en `client_pipeline_stage_events` (tabla aparte):
--    la regla del proyecto es no sobreescribir contenido aprobado, así que
--    cada generación, cada petición de cambio y cada aprobación deja rastro.
--
--  · Las referencias al contenido generado son sueltas (`client_dna_id`,
--    `product_dna_id`) y NO llevan FK: esas tablas versionan por su cuenta
--    (client_dna.is_active) y no queremos que borrar una versión tumbe el run.

-- ---------------------------------------------------------------------
-- 1. Tabla principal
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_pipeline_runs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id           uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  onboarding_form_id  uuid REFERENCES public.client_onboarding_forms(id) ON DELETE SET NULL,
  product_id          uuid REFERENCES public.products(id) ON DELETE SET NULL,

  stage        text NOT NULL DEFAULT 'onboarding'
    CHECK (stage IN ('onboarding','adn','estrategia','guiones','produccion')),
  stage_status text NOT NULL DEFAULT 'awaiting_client'
    CHECK (stage_status IN ('generating','awaiting_client','changes_requested','approved','error','paused_no_tokens')),

  -- Referencias a lo generado en cada etapa (sin FK a propósito, ver cabecera)
  client_dna_id   uuid,
  product_dna_id  uuid,

  -- {"adn": 1, "estrategia": 0, "guiones": 2}
  stage_attempts jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- [{stage, at, error, detail}]
  error_log      jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Último texto libre del cliente al pedir un cambio
  last_feedback  text,

  -- Cuántos guiones genera el lote inicial (configurable por organización)
  scripts_target int NOT NULL DEFAULT 5 CHECK (scripts_target BETWEEN 1 AND 20),

  onboarding_completed_at timestamptz,
  adn_started_at          timestamptz,
  adn_approved_at         timestamptz,
  estrategia_started_at   timestamptz,
  estrategia_approved_at  timestamptz,
  guiones_started_at      timestamptz,
  guiones_approved_at     timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Un solo run vivo por cliente: evita que dos submits creen dos pipelines
  CONSTRAINT client_pipeline_runs_client_unique UNIQUE (client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_pipeline_runs_org     ON public.client_pipeline_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_pipeline_runs_client  ON public.client_pipeline_runs(client_id);
CREATE INDEX IF NOT EXISTS idx_client_pipeline_runs_stage   ON public.client_pipeline_runs(stage, stage_status);
CREATE INDEX IF NOT EXISTS idx_client_pipeline_runs_product ON public.client_pipeline_runs(product_id);

COMMENT ON TABLE public.client_pipeline_runs IS
  'Pipeline autónomo del cliente: onboarding → ADN → estrategia → guiones. Una fila por cliente. Avanza solo entre etapas y se detiene en cada una esperando aprobación del cliente.';

-- ---------------------------------------------------------------------
-- 2. Histórico por etapa — nunca se sobreescribe
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_pipeline_stage_events (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id   uuid NOT NULL REFERENCES public.client_pipeline_runs(id) ON DELETE CASCADE,
  stage    text NOT NULL
    CHECK (stage IN ('onboarding','adn','estrategia','guiones','produccion')),
  event    text NOT NULL
    CHECK (event IN ('generated','approved','changes_requested','error','escalated','paused_no_tokens')),
  -- Texto del cliente cuando pide un cambio
  feedback text,
  -- Referencia a lo generado en ese intento (client_dna_id, product_dna_id, content_ids…)
  payload  jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Quién lo provocó: el cliente, el equipo, o el propio sistema
  actor_id uuid,
  actor    text NOT NULL DEFAULT 'system' CHECK (actor IN ('system','client','staff')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stage_events_run ON public.client_pipeline_stage_events(run_id, created_at DESC);

COMMENT ON TABLE public.client_pipeline_stage_events IS
  'Histórico del pipeline: cada generación, aprobación y petición de cambio. Append-only, no se sobreescribe (regla de protección de contenido aprobado).';

-- ---------------------------------------------------------------------
-- 3. updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_client_pipeline_runs()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_client_pipeline_runs ON public.client_pipeline_runs;
CREATE TRIGGER trg_touch_client_pipeline_runs
  BEFORE UPDATE ON public.client_pipeline_runs
  FOR EACH ROW EXECUTE FUNCTION public.touch_client_pipeline_runs();

-- ---------------------------------------------------------------------
-- 4. RLS
--    Mismo predicado de staff que `client_onboarding_forms` (incluye los
--    roles legacy team_leader/strategist por compatibilidad, aunque hoy no
--    tengan filas), MÁS el cliente dueño del run, que solo puede LEER.
-- ---------------------------------------------------------------------
ALTER TABLE public.client_pipeline_runs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_pipeline_stage_events  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org staff can manage client pipeline runs" ON public.client_pipeline_runs;
CREATE POLICY "Org staff can manage client pipeline runs"
ON public.client_pipeline_runs FOR ALL TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.role = ANY (ARRAY['admin'::app_role, 'team_leader'::app_role,
        'strategist'::app_role, 'digital_strategist'::app_role, 'creative_strategist'::app_role])
  )
)
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.role = ANY (ARRAY['admin'::app_role, 'team_leader'::app_role,
        'strategist'::app_role, 'digital_strategist'::app_role, 'creative_strategist'::app_role])
  )
);

-- El cliente ve su propio run (solo lectura). El acceso se resuelve por
-- client_users, que es el mecanismo vigente del portal de cliente.
DROP POLICY IF EXISTS "Client can view own pipeline run" ON public.client_pipeline_runs;
CREATE POLICY "Client can view own pipeline run"
ON public.client_pipeline_runs FOR SELECT TO authenticated
USING (
  client_id IN (SELECT cu.client_id FROM public.client_users cu WHERE cu.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Org staff can manage pipeline stage events" ON public.client_pipeline_stage_events;
CREATE POLICY "Org staff can manage pipeline stage events"
ON public.client_pipeline_stage_events FOR ALL TO authenticated
USING (
  run_id IN (
    SELECT r.id FROM public.client_pipeline_runs r
    WHERE r.organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['admin'::app_role, 'team_leader'::app_role,
          'strategist'::app_role, 'digital_strategist'::app_role, 'creative_strategist'::app_role])
    )
  )
)
WITH CHECK (
  run_id IN (
    SELECT r.id FROM public.client_pipeline_runs r
    WHERE r.organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['admin'::app_role, 'team_leader'::app_role,
          'strategist'::app_role, 'digital_strategist'::app_role, 'creative_strategist'::app_role])
    )
  )
);

DROP POLICY IF EXISTS "Client can view own pipeline events" ON public.client_pipeline_stage_events;
CREATE POLICY "Client can view own pipeline events"
ON public.client_pipeline_stage_events FOR SELECT TO authenticated
USING (
  run_id IN (
    SELECT r.id FROM public.client_pipeline_runs r
    WHERE r.client_id IN (SELECT cu.client_id FROM public.client_users cu WHERE cu.user_id = auth.uid())
  )
);

-- ---------------------------------------------------------------------
-- 5. GRANTs
--    Sin esto, las edge functions con service_role dan "permission denied"
--    y devuelven 500 en silencio (incidente real del proyecto con las
--    tablas academy_*).
-- ---------------------------------------------------------------------
GRANT ALL ON public.client_pipeline_runs         TO service_role;
GRANT ALL ON public.client_pipeline_stage_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_pipeline_runs         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_pipeline_stage_events TO authenticated;

NOTIFY pgrst, 'reload schema';
