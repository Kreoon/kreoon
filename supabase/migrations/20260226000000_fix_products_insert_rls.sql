-- Fix: miembros de org no pueden crear productos desde el wizard del brief
--
-- Causa raíz: solo admins (con current_organization_id != NULL) y client_users
-- tienen política INSERT en products. Strategists, team_leaders y otros roles
-- que crean productos desde ClientDashboard/ClientDetailDialog son bloqueados por RLS.
--
-- Solución: agregar INSERT policy para org members, consistente con la policy
-- UPDATE "Org configurers can update products" que ya existe (20260202210000).

-- 1. Política INSERT para miembros de organización
CREATE POLICY "Org members can insert products for org clients"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = products.client_id
    AND public.is_org_member(auth.uid(), c.organization_id)
  )
);

-- 2. Fallback DELETE para org members (consistencia con INSERT/UPDATE)
-- Actualmente solo admins pueden DELETE; si get_current_organization_id() es NULL, fallan
CREATE POLICY "Org members can delete products for org clients"
ON public.products
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = products.client_id
    AND public.is_org_member(auth.uid(), c.organization_id)
  )
);
