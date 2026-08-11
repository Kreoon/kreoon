-- ============================================================================
-- Estado del post-procesamiento del onboarding, paso por paso
-- ============================================================================
-- Fecha: 2026-08-11
--
-- El botón "Procesar onboarding" ejecuta varios pasos (actualizar el cliente,
-- invitar al portal, disparar el ADN del producto). Debe poder reintentarse sin
-- duplicar nada, así que cada paso deja su resultado acá y el siguiente intento
-- lo consulta antes de volver a ejecutarlo.
--
-- Forma de `processing`:
--   {
--     "pasos": {
--       "cliente":    { "ok": true, "en": "<ISO>", "detalle": "..." },
--       "invitacion": { "ok": true, "en": "<ISO>", "detalle": "...", "caso": "vinculado|invitado" },
--       "adn":        { "ok": true, "en": "<ISO>", "product_dna_id": "<uuid>" }
--     },
--     "procesado_por": "<uuid>",
--     "procesado_en": "<ISO>"
--   }
--
-- `pasos.adn.product_dna_id` es la clave de idempotencia del paso de ADN: si ya
-- está, no se vuelve a crear la fila de product_dna ni se reinvoca la IA (cada
-- corrida cuesta Perplexity + Firecrawl + 4 llamadas a LLM).
--
-- Va en columna aparte y NO dentro de form_data por lo mismo que portal_invite:
-- form_data lo escribe la edge function pública del cliente y un merge de
-- sección podría pisar metadata del lado admin.
--
-- Rollback:
--   ALTER TABLE public.client_onboarding_forms DROP COLUMN processing;
-- ============================================================================

ALTER TABLE public.client_onboarding_forms
  ADD COLUMN IF NOT EXISTS processing jsonb;

COMMENT ON COLUMN public.client_onboarding_forms.processing IS
  'Resultado por paso del post-procesamiento (cliente, invitacion, adn) + quién y cuándo. pasos.adn.product_dna_id es el guard de idempotencia del disparo de ADN.';

NOTIFY pgrst, 'reload schema';
