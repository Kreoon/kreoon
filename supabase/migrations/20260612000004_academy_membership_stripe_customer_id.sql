-- Guardar el stripe_customer_id en cada membresía paga para poder abrir
-- el Stripe Billing Portal del usuario (cancelar / cambiar tarjeta / facturas).
-- El webhook `handleAcademyMembershipPurchase` rellena esta columna al
-- procesar `checkout.session.completed`.

ALTER TABLE public.academy_memberships
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_academy_memberships_stripe_customer
  ON public.academy_memberships(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
