-- ============================================================
-- Proyectos Ad-hoc + Fillmaker (Servicio de Grabación)
-- con Cierres por Cliente
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Tabla de cierres de cuenta por cliente
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.client_closings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  total_amount     NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'COP',
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'sent', 'paid')),
  payment_date     DATE,
  payment_method   TEXT,
  notes            TEXT,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_closings_org
  ON public.client_closings(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_closings_client
  ON public.client_closings(client_id, status);

CREATE OR REPLACE FUNCTION public.update_client_closings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_client_closings_updated_at
  BEFORE UPDATE ON public.client_closings
  FOR EACH ROW EXECUTE FUNCTION public.update_client_closings_updated_at();

ALTER TABLE public.client_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_closings_select_members" ON public.client_closings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "client_closings_insert_admins" ON public.client_closings
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role::text = 'admin'
    )
  );

CREATE POLICY "client_closings_update_admins" ON public.client_closings
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role::text = 'admin'
    )
  );

CREATE POLICY "client_closings_delete_admins" ON public.client_closings
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role::text = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 2. Tabla de servicios Fillmaker (Servicio de Grabación)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fillmaker_services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  service_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  price_client      NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price_client >= 0),
  cost_own          NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost_own >= 0),
  currency          TEXT NOT NULL DEFAULT 'COP',
  editor_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  billing_status    TEXT NOT NULL DEFAULT 'pending'
                    CHECK (billing_status IN ('pending', 'in_closing', 'paid')),
  client_closing_id UUID REFERENCES public.client_closings(id) ON DELETE SET NULL,
  notes             TEXT,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fillmaker_org
  ON public.fillmaker_services(organization_id, service_date DESC);

CREATE INDEX IF NOT EXISTS idx_fillmaker_client
  ON public.fillmaker_services(client_id, billing_status);

CREATE INDEX IF NOT EXISTS idx_fillmaker_closing
  ON public.fillmaker_services(client_closing_id)
  WHERE client_closing_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_fillmaker_services_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_fillmaker_services_updated_at
  BEFORE UPDATE ON public.fillmaker_services
  FOR EACH ROW EXECUTE FUNCTION public.update_fillmaker_services_updated_at();

ALTER TABLE public.fillmaker_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fillmaker_select_members" ON public.fillmaker_services
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "fillmaker_insert_admins" ON public.fillmaker_services
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role::text = 'admin'
    )
  );

CREATE POLICY "fillmaker_update_admins" ON public.fillmaker_services
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role::text = 'admin'
    )
  );

CREATE POLICY "fillmaker_delete_admins" ON public.fillmaker_services
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role::text = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. Columnas de facturación en tabla content (proyectos ad-hoc)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS billing_price    NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_currency TEXT DEFAULT 'COP',
  ADD COLUMN IF NOT EXISTS billing_status   TEXT DEFAULT 'pending'
    CHECK (billing_status IN ('pending', 'in_closing', 'paid')),
  ADD COLUMN IF NOT EXISTS client_closing_id UUID REFERENCES public.client_closings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_content_billing_status
  ON public.content(client_id, billing_status)
  WHERE client_package_id IS NULL AND client_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 4. RPC: ítems pendientes de cobro para un cliente
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_client_billing_items(
  p_org_id    UUID,
  p_client_id UUID
)
RETURNS TABLE (
  id             UUID,
  item_type      TEXT,
  title          TEXT,
  description    TEXT,
  item_date      DATE,
  price_client   NUMERIC,
  cost_own       NUMERIC,
  currency       TEXT,
  billing_status TEXT,
  editor_id      UUID,
  closing_id     UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Proyectos ad-hoc: content sin client_package_id
  RETURN QUERY
  SELECT
    c.id,
    'project'::TEXT           AS item_type,
    c.title,
    c.description,
    c.created_at::DATE        AS item_date,
    COALESCE(c.billing_price, 0) AS price_client,
    0::NUMERIC                AS cost_own,
    COALESCE(c.billing_currency, 'COP') AS currency,
    COALESCE(c.billing_status, 'pending') AS billing_status,
    NULL::UUID                AS editor_id,
    c.client_closing_id       AS closing_id
  FROM public.content c
  JOIN public.clients cl ON cl.id = c.client_id
  WHERE cl.organization_id = p_org_id
    AND c.client_id = p_client_id
    AND c.client_package_id IS NULL

  UNION ALL

  -- Servicios Fillmaker
  SELECT
    f.id,
    'fillmaker'::TEXT         AS item_type,
    f.title,
    f.description,
    f.service_date            AS item_date,
    f.price_client,
    f.cost_own,
    f.currency,
    f.billing_status,
    f.editor_id,
    f.client_closing_id       AS closing_id
  FROM public.fillmaker_services f
  WHERE f.organization_id = p_org_id
    AND f.client_id = p_client_id

  ORDER BY item_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_billing_items(UUID, UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. RPC: crear cierre y marcar ítems en una transacción
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_client_closing(
  p_org_id             UUID,
  p_client_id          UUID,
  p_name               TEXT,
  p_currency           TEXT,
  p_notes              TEXT,
  p_content_ids        UUID[],
  p_fillmaker_ids      UUID[],
  p_created_by         UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closing_id    UUID;
  v_total         NUMERIC := 0;
  v_content_total NUMERIC := 0;
  v_fill_total    NUMERIC := 0;
BEGIN
  -- Calcular total de proyectos
  SELECT COALESCE(SUM(billing_price), 0)
  INTO v_content_total
  FROM public.content
  WHERE id = ANY(p_content_ids)
    AND client_id = p_client_id
    AND billing_status = 'pending';

  -- Calcular total de fillmakers
  SELECT COALESCE(SUM(price_client), 0)
  INTO v_fill_total
  FROM public.fillmaker_services
  WHERE id = ANY(p_fillmaker_ids)
    AND client_id = p_client_id
    AND billing_status = 'pending';

  v_total := v_content_total + v_fill_total;

  -- Crear el cierre
  INSERT INTO public.client_closings (
    organization_id, client_id, name, total_amount, currency, status, notes, created_by
  ) VALUES (
    p_org_id, p_client_id, p_name, v_total, p_currency, 'draft', p_notes, p_created_by
  )
  RETURNING id INTO v_closing_id;

  -- Marcar proyectos ad-hoc
  IF array_length(p_content_ids, 1) > 0 THEN
    UPDATE public.content
    SET billing_status = 'in_closing',
        client_closing_id = v_closing_id
    WHERE id = ANY(p_content_ids)
      AND client_id = p_client_id
      AND billing_status = 'pending';
  END IF;

  -- Marcar fillmakers
  IF array_length(p_fillmaker_ids, 1) > 0 THEN
    UPDATE public.fillmaker_services
    SET billing_status = 'in_closing',
        client_closing_id = v_closing_id
    WHERE id = ANY(p_fillmaker_ids)
      AND client_id = p_client_id
      AND billing_status = 'pending';
  END IF;

  RETURN v_closing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_client_closing(UUID, UUID, TEXT, TEXT, TEXT, UUID[], UUID[], UUID) TO authenticated;

-- Permisos de tabla para PostgREST
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fillmaker_services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_closings TO authenticated;
