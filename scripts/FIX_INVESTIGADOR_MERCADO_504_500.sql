-- ============================================================
-- FIX 504 clients / 500 products - Investigador de mercado
-- ============================================================
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- https://supabase.com/dashboard/project/wjkbqcrxwsmvtxmqgiqc/sql/new
-- ============================================================

-- 1. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;

-- 2. Índices (aceleran RLS, evitan 504)
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_products_client_id ON public.products(client_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_org ON public.organization_members(user_id, organization_id);

-- 3. Política de respaldo: org configurers pueden UPDATE products
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
