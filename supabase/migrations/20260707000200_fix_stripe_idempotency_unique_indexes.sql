-- FASE checklist seccion 3: idempotencia real de reintentos de Stripe.
--
-- Hallazgo: handleCampaignCheckoutCompleted (campaigns.ts) no tenia NINGUNA
-- proteccion contra reintentos de webhook -- cada reintento insertaba un
-- escrow_holds y unified_transactions duplicado por el mismo cobro unico.
-- handleCreatorHirePaymentCompleted (marketplace.ts) ya tenia un guard
-- check-then-insert (SELECT por stripe_session_id antes de insertar) pero
-- sin proteccion atomica contra dos entregas de webhook solapadas.
--
-- Estos indices UNIQUE parciales son el backstop atomico real: si dos
-- requests concurrentes pasan ambas el SELECT-guard antes de que cualquiera
-- termine el INSERT, el segundo INSERT falla con 23505 (unique_violation)
-- en vez de crear una fila duplicada. El codigo (ya actualizado en
-- campaigns.ts) captura ese codigo y lo trata como "ya procesado".

CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_holds_stripe_payment_intent_unique
  ON public.escrow_holds (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_projects_stripe_session_unique
  ON public.marketplace_projects (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
