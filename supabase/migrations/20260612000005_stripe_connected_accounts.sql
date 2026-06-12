-- ============================================================
-- Mapping user (owner de academias/cursos) ↔ cuenta Stripe Connect.
-- Soporta el modelo de "destination charges" con application fee:
-- los cobros entran directo a la cuenta del owner y KREOON descuenta
-- su comisión automáticamente.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stripe_connected_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_connected_accounts_account
  ON public.stripe_connected_accounts(stripe_account_id);

ALTER TABLE public.stripe_connected_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_connect_account" ON public.stripe_connected_accounts;
CREATE POLICY "users_read_own_connect_account"
  ON public.stripe_connected_accounts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.stripe_connected_accounts TO authenticated;

-- RPCs SECURITY DEFINER usados por las edge functions de Connect
-- (mismo patrón que stripe-sync-product: usa caller_secret en lugar
-- del service role key que no se inyecta confiablemente).

CREATE OR REPLACE FUNCTION public.get_stripe_connect_for_space(
  p_caller_secret TEXT,
  p_space_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public._stripe_sync_check_secret(p_caller_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT to_jsonb(t) INTO v_result
  FROM (
    SELECT s.id AS space_id, s.owner_id, s.plan_slug,
           c.stripe_account_id
    FROM academy_spaces s
    LEFT JOIN stripe_connected_accounts c ON c.user_id = s.owner_id
    WHERE s.id = p_space_id
  ) t;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stripe_connect_for_space(TEXT, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_stripe_connect_for_course(
  p_caller_secret TEXT,
  p_course_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public._stripe_sync_check_secret(p_caller_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT to_jsonb(t) INTO v_result
  FROM (
    SELECT cr.id AS course_id, cr.space_id, s.owner_id, s.plan_slug,
           c.stripe_account_id
    FROM academy_courses cr
    JOIN academy_spaces s ON s.id = cr.space_id
    LEFT JOIN stripe_connected_accounts c ON c.user_id = s.owner_id
    WHERE cr.id = p_course_id
  ) t;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stripe_connect_for_course(TEXT, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.upsert_stripe_connect_account(
  p_caller_secret TEXT,
  p_user_id UUID,
  p_stripe_account_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._stripe_sync_check_secret(p_caller_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_stripe_account_id IS NULL OR p_stripe_account_id !~ '^acct_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'invalid_account_id_format' USING ERRCODE = '22023';
  END IF;

  INSERT INTO stripe_connected_accounts (user_id, stripe_account_id, updated_at)
  VALUES (p_user_id, p_stripe_account_id, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET stripe_account_id = EXCLUDED.stripe_account_id,
        updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_stripe_connect_account(TEXT, UUID, TEXT) TO anon, authenticated;
