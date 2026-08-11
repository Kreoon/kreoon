-- ============================================================================
-- Registro de la invitación al portal en el formulario de onboarding
-- ============================================================================
-- Fecha: 2026-08-11
--
-- Guarda quién invitó, cuándo y con qué resultado. Va en una columna aparte y
-- NO dentro de form_data: form_data es la respuesta del cliente y la escribe la
-- edge function pública client-onboarding-submit; mezclarlo con metadata del
-- lado admin haría que un merge de sección pudiera pisarla.
--
-- Forma de portal_invite:
--   {
--     "estado": "vinculado" | "invitado" | "error",
--     "correo": "portal@empresa.com",
--     "user_id": "<uuid>" | null,
--     "invitado_por": "<uuid>",
--     "invitado_en": "<timestamptz ISO>",
--     "detalle": "texto corto"
--   }
--
-- Rollback:
--   ALTER TABLE public.client_onboarding_forms DROP COLUMN portal_invite;
-- ============================================================================

ALTER TABLE public.client_onboarding_forms
  ADD COLUMN IF NOT EXISTS portal_invite jsonb;

COMMENT ON COLUMN public.client_onboarding_forms.portal_invite IS
  'Resultado de la invitación al portal (estado, correo, user_id, invitado_por, invitado_en, detalle). Separado de form_data porque form_data lo escribe el endpoint público del cliente.';

NOTIFY pgrst, 'reload schema';
