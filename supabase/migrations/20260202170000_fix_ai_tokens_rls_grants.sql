-- Fix 403 Forbidden: grants y políticas para organization_ai_tokens y ai_token_transactions
-- Error: permission denied for table organization_ai_tokens (42501)

-- 1. Grants explícitos para el rol authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_ai_tokens TO authenticated;
GRANT SELECT, INSERT ON public.ai_token_transactions TO authenticated;

-- 2. Política adicional: platform admins pueden gestionar tokens de cualquier org
-- (por si is_org_configurer no aplica por contexto de org)
CREATE POLICY "Platform admins can manage all ai tokens"
  ON public.organization_ai_tokens FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can manage token transactions"
  ON public.ai_token_transactions FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));
