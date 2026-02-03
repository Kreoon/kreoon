-- Fix 504/500 en investigador de mercado: clients y products
-- 1. Grants explícitos por si faltan
-- 2. Índices para acelerar RLS (evitar timeouts 504)
-- 3. Política de respaldo para products UPDATE (por si get_current_organization_id falla)

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;

-- Índices para políticas RLS (crítico para evitar 504)
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_products_client_id ON public.products(client_id);
-- is_org_member usa organization_members: acelera clients y products
CREATE INDEX IF NOT EXISTS idx_org_members_user_org ON public.organization_members(user_id, organization_id);

-- Fallback: org members (configurers) pueden UPDATE products para clientes de su org
-- Útil cuando get_current_organization_id devuelve NULL
DROP POLICY IF EXISTS "Org configurers can update products" ON public.products;
CREATE POLICY "Org configurers can update products"
ON public.products
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = products.client_id
    AND (public.is_org_configurer(auth.uid(), c.organization_id) OR public.is_org_member(auth.uid(), c.organization_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = products.client_id
    AND (public.is_org_configurer(auth.uid(), c.organization_id) OR public.is_org_member(auth.uid(), c.organization_id))
  )
);
