-- CONTENT: Add policy so strategists can see content assigned to them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'content' AND policyname = 'Strategists can view assigned content'
  ) THEN
    CREATE POLICY "Strategists can view assigned content"
    ON public.content
    FOR SELECT
    USING (strategist_id = auth.uid());
  END IF;
END $$;

-- CONTENT: Add policy so strategists can update assigned content  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'content' AND policyname = 'Strategists can update assigned content'
  ) THEN
    CREATE POLICY "Strategists can update assigned content"
    ON public.content
    FOR UPDATE
    USING (strategist_id = auth.uid());
  END IF;
END $$;

-- PRODUCTS: need to scope products by organization via clients
-- First drop overly-permissive policy if exists
DROP POLICY IF EXISTS "Authenticated can view products" ON public.products;

-- Products should be visible only to:
-- 1. Members of the org that owns the client
-- 2. Client users of that client
-- 3. Admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'Org members can view org products'
  ) THEN
    CREATE POLICY "Org members can view org products"
    ON public.products
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = products.client_id
        AND public.is_org_member(auth.uid(), c.organization_id)
      )
    );
  END IF;
END $$;

-- CLIENT_PACKAGES: scope by organization via client
DROP POLICY IF EXISTS "Authenticated can view packages" ON public.client_packages;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'client_packages' AND policyname = 'Org members can view org packages'
  ) THEN
    CREATE POLICY "Org members can view org packages"
    ON public.client_packages
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = client_packages.client_id
        AND public.is_org_member(auth.uid(), c.organization_id)
      )
    );
  END IF;
END $$;
