-- ============================================================
-- Acceso de usuarios cliente a sus propios documentos financieros
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. client_closings: clientes ven sus propios cierres
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "clients_see_own_closings"
  ON public.client_closings
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 2. fillmaker_services: clientes ven servicios de sus cierres
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "clients_see_own_fillmaker"
  ON public.fillmaker_services
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. client_package_payments: clientes ven pagos de sus paquetes
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "clients_see_own_package_payments"
  ON public.client_package_payments
  FOR SELECT
  USING (
    client_package_id IN (
      SELECT cp.id
      FROM public.client_packages cp
      JOIN public.clients c ON c.id = cp.client_id
      WHERE c.user_id = auth.uid()
    )
  );
