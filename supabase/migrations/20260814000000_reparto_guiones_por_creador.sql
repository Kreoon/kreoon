-- ============================================================================
-- KREOON — El cliente decide cuántos guiones son para cada creador
--
-- Antes: al confirmar creadores en el portal (`select_creators`), el reparto
-- de guiones era round-robin automático (creadores[indice % creadores.length])
-- sin que el cliente pudiera decidir cuántos le tocan a cada uno, y confirmar
-- disparaba la generación de inmediato — sin margen para cambiar de opinión.
--
-- Ahora: `select_creators` acepta un `allocation` opcional y YA NO genera; la
-- generación arranca con la acción separada `start_scripts`. Ver
-- supabase/functions/pipeline-orchestrator/index.ts.
-- ============================================================================

ALTER TABLE public.client_pipeline_runs
  ADD COLUMN IF NOT EXISTS creator_allocation jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.client_pipeline_runs.creator_allocation IS
  'Cuántos guiones le tocan a cada creador confirmado en selected_creator_ids. Formato: {"<user_id>": 3, "<user_id2>": 2} — la suma debe ser igual a scripts_target (lo valida la acción select_creators). {} (default) significa reparto automático equitativo, el comportamiento de siempre — así los runs viejos, creados antes de esta columna, se leen sin cambios.';
