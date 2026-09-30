-- ============================================================================
-- Secciones del onboarding que el admin decide que el cliente NO llene
-- ============================================================================
-- Fecha: 2026-09-30
--
-- El admin/estratega puede marcar, por empresa, qué pasos del wizard de
-- onboarding debe llenar el cliente. Las secciones listadas aquí se omiten en
-- el wizard y dejan de ser obligatorias en el envio final (el servidor las
-- excluye de findMissingRequiredFields). El paso de cierre ('logistica') no es
-- omitible: es el que contiene el boton de envio.
--
-- Escritura: ya cubierta por la politica "Org staff can manage client
-- onboarding forms" (ALL); no se agregan politicas nuevas.
--
-- Rollback:
--   ALTER TABLE public.client_onboarding_forms DROP COLUMN omitted_sections;
-- ============================================================================

ALTER TABLE public.client_onboarding_forms
  ADD COLUMN IF NOT EXISTS omitted_sections text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.client_onboarding_forms
  DROP CONSTRAINT IF EXISTS client_onboarding_forms_omitted_sections_valid;

ALTER TABLE public.client_onboarding_forms
  ADD CONSTRAINT client_onboarding_forms_omitted_sections_valid
  CHECK (omitted_sections <@ ARRAY['legal','equipo','marca','producto','contenido']::text[]);

COMMENT ON COLUMN public.client_onboarding_forms.omitted_sections IS
  'Secciones del wizard que el cliente NO debe llenar (decision del admin). Omitidas del wizard y excluidas de los obligatorios del envio final.';

NOTIFY pgrst, 'reload schema';
