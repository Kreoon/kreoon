-- Relanzamiento Kreoon / UGC Colombia — Fase 6: membresias de marca solo en marcas propias.
--
-- Hallazgo [VIVO 2026-09-30]: policy brand_members_insert (INSERT, authenticated):
--   (user_id = auth.uid()) OR (brand_id IN brands propias) OR is_platform_root(auth.uid())
-- La primera rama no restringe brand_id NI role/status: cualquier usuario autenticado puede insertarse
-- como miembro —incluso role='owner', status='active'— de CUALQUIER marca y pasar a las policies que
-- confian en ser owner de esa marca (p. ej. "Brand owners can insert client for their brand").
--
-- Fix: solo se inserta membresia en marcas de las que se es propietario (incluye la auto-membresia
-- 'owner' al crear la marca propia: ClientDashboard, UpgradeToBrandWizard) o el propietario de la plataforma
-- (BrandsCRM crea la marca con owner_id de otra persona). Las invitaciones de equipo a una marca
-- las agrega su propietario, que ya estaba permitido.

DROP POLICY IF EXISTS brand_members_insert ON public.brand_members;

CREATE POLICY brand_members_insert ON public.brand_members
  FOR INSERT TO authenticated
  WITH CHECK (
    brand_id IN (SELECT b.id FROM public.brands b WHERE b.owner_id = auth.uid())
    OR public.is_platform_root(auth.uid())
  );

NOTIFY pgrst, 'reload schema';
