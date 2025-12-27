-- Scope platform admin access by current organization context

-- 1) Helper: get user's current organization id (from profiles)
CREATE OR REPLACE FUNCTION public.get_current_organization_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT current_organization_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- 2) GOALS: replace unrestricted admin policy with org-scoped platform-admin policy
DROP POLICY IF EXISTS "Admins can manage goals" ON public.goals;

CREATE POLICY "Platform admins can manage goals in current org"
ON public.goals
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.get_current_organization_id(auth.uid()) IS NOT NULL
  AND organization_id = public.get_current_organization_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.get_current_organization_id(auth.uid()) IS NOT NULL
  AND organization_id = public.get_current_organization_id(auth.uid())
);

-- 3) CLIENTS: replace unrestricted admin policy with org-scoped platform-admin policy
DROP POLICY IF EXISTS "Admins can manage clients" ON public.clients;

CREATE POLICY "Platform admins can manage clients in current org"
ON public.clients
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.get_current_organization_id(auth.uid()) IS NOT NULL
  AND organization_id = public.get_current_organization_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.get_current_organization_id(auth.uid()) IS NOT NULL
  AND organization_id = public.get_current_organization_id(auth.uid())
);

-- 4) PRODUCTS: add platform-admin policy scoped by current org via clients
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

CREATE POLICY "Platform admins can manage products in current org"
ON public.products
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.get_current_organization_id(auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = products.client_id
      AND c.organization_id = public.get_current_organization_id(auth.uid())
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.get_current_organization_id(auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = products.client_id
      AND c.organization_id = public.get_current_organization_id(auth.uid())
  )
);

-- 5) CLIENT_PACKAGES: add platform-admin policy scoped by current org via clients
DROP POLICY IF EXISTS "Admins can manage packages" ON public.client_packages;

CREATE POLICY "Platform admins can manage packages in current org"
ON public.client_packages
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.get_current_organization_id(auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = client_packages.client_id
      AND c.organization_id = public.get_current_organization_id(auth.uid())
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.get_current_organization_id(auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = client_packages.client_id
      AND c.organization_id = public.get_current_organization_id(auth.uid())
  )
);

-- 6) CONTENT: replace unrestricted admin policy with org-scoped platform-admin policy
DROP POLICY IF EXISTS "Admins can do everything with content" ON public.content;

CREATE POLICY "Platform admins can manage content in current org"
ON public.content
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.get_current_organization_id(auth.uid()) IS NOT NULL
  AND (
    content.organization_id = public.get_current_organization_id(auth.uid())
    OR (
      content.organization_id IS NULL
      AND content.client_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.clients c
        WHERE c.id = content.client_id
          AND c.organization_id = public.get_current_organization_id(auth.uid())
      )
    )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.get_current_organization_id(auth.uid()) IS NOT NULL
  AND (
    content.organization_id = public.get_current_organization_id(auth.uid())
    OR (
      content.organization_id IS NULL
      AND content.client_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.clients c
        WHERE c.id = content.client_id
          AND c.organization_id = public.get_current_organization_id(auth.uid())
      )
    )
  )
);
