-- ============================================
-- Módulo de Costos Operativos y Cierres Financieros
-- ============================================

-- Tabla principal de costos
CREATE TABLE IF NOT EXISTS org_financial_costs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  amount              NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency            TEXT NOT NULL DEFAULT 'COP',
  category            TEXT NOT NULL DEFAULT 'operativo',
  -- operativo | plataforma | equipo | agencia | impuesto | talento | otro
  client_package_id   UUID REFERENCES client_packages(id) ON DELETE SET NULL,
  cost_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  notes               TEXT,
  receipt_url         TEXT,
  receipt_filename    TEXT,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS org_financial_costs_org_date_idx
  ON org_financial_costs(organization_id, cost_date DESC);

CREATE INDEX IF NOT EXISTS org_financial_costs_package_idx
  ON org_financial_costs(client_package_id)
  WHERE client_package_id IS NOT NULL;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_org_financial_costs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_org_financial_costs_updated_at
  BEFORE UPDATE ON org_financial_costs
  FOR EACH ROW EXECUTE FUNCTION update_org_financial_costs_updated_at();

-- RLS
ALTER TABLE org_financial_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "costs_select_org_members" ON org_financial_costs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "costs_insert_admins" ON org_financial_costs
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND 'admin' = ANY(roles)
    )
  );

CREATE POLICY "costs_update_admins" ON org_financial_costs
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND 'admin' = ANY(roles)
    )
  );

CREATE POLICY "costs_delete_admins" ON org_financial_costs
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND 'admin' = ANY(roles)
    )
  );

-- ============================================
-- Tabla de Cierres Financieros
-- ============================================

CREATE TABLE IF NOT EXISTS org_financial_closings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  total_income     NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_costs      NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'COP',
  status           TEXT NOT NULL DEFAULT 'open',
  -- open | closed
  notes            TEXT,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_period CHECK (period_end >= period_start),
  CONSTRAINT valid_status CHECK (status IN ('open', 'closed'))
);

CREATE INDEX IF NOT EXISTS org_financial_closings_org_idx
  ON org_financial_closings(organization_id, created_at DESC);

CREATE OR REPLACE FUNCTION update_org_financial_closings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_org_financial_closings_updated_at
  BEFORE UPDATE ON org_financial_closings
  FOR EACH ROW EXECUTE FUNCTION update_org_financial_closings_updated_at();

ALTER TABLE org_financial_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "closings_select_org_members" ON org_financial_closings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "closings_insert_admins" ON org_financial_closings
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND 'admin' = ANY(roles)
    )
  );

CREATE POLICY "closings_update_admins" ON org_financial_closings
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND 'admin' = ANY(roles)
    )
  );

CREATE POLICY "closings_delete_admins" ON org_financial_closings
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND 'admin' = ANY(roles)
    )
  );

-- ============================================
-- Storage bucket para soportes
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'financial-receipts',
  'financial-receipts',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS storage: solo miembros de la org ven sus propios archivos
CREATE POLICY "receipts_select_org" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'financial-receipts'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "receipts_insert_admins" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'financial-receipts'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "receipts_delete_admins" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'financial-receipts'
    AND auth.uid() IS NOT NULL
  );

-- ============================================
-- RPC: resumen de período para cierre
-- ============================================

CREATE OR REPLACE FUNCTION get_financial_period_summary(
  p_org_id     UUID,
  p_start      DATE,
  p_end        DATE,
  p_currency   TEXT DEFAULT 'COP'
)
RETURNS TABLE (
  total_income          NUMERIC,
  total_costs           NUMERIC,
  net_profit            NUMERIC,
  income_by_client      JSONB,
  costs_by_category     JSONB,
  packages_count        BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_income        NUMERIC := 0;
  v_costs         NUMERIC := 0;
  v_income_json   JSONB := '[]'::JSONB;
  v_costs_json    JSONB := '[]'::JSONB;
  v_pkg_count     BIGINT := 0;
BEGIN
  -- Ingresos: pagos registrados en el período
  SELECT COALESCE(SUM(pp.amount), 0), COUNT(DISTINCT pp.client_package_id)
  INTO v_income, v_pkg_count
  FROM client_package_payments pp
  JOIN client_packages cp ON cp.id = pp.client_package_id
  JOIN clients c ON c.id = cp.client_id
  WHERE c.organization_id = p_org_id
    AND pp.payment_date BETWEEN p_start AND p_end
    AND cp.currency = p_currency;

  -- Desglose ingresos por cliente
  SELECT COALESCE(jsonb_agg(r ORDER BY r->>'total' DESC), '[]'::JSONB)
  INTO v_income_json
  FROM (
    SELECT jsonb_build_object(
      'client', c.name,
      'total', SUM(pp.amount)
    ) AS r
    FROM client_package_payments pp
    JOIN client_packages cp ON cp.id = pp.client_package_id
    JOIN clients c ON c.id = cp.client_id
    WHERE c.organization_id = p_org_id
      AND pp.payment_date BETWEEN p_start AND p_end
      AND cp.currency = p_currency
    GROUP BY c.name
  ) sub;

  -- Costos del período
  SELECT COALESCE(SUM(amount), 0)
  INTO v_costs
  FROM org_financial_costs
  WHERE organization_id = p_org_id
    AND cost_date BETWEEN p_start AND p_end
    AND currency = p_currency;

  -- Desglose costos por categoría
  SELECT COALESCE(jsonb_agg(r ORDER BY r->>'total' DESC), '[]'::JSONB)
  INTO v_costs_json
  FROM (
    SELECT jsonb_build_object(
      'category', category,
      'total', SUM(amount)
    ) AS r
    FROM org_financial_costs
    WHERE organization_id = p_org_id
      AND cost_date BETWEEN p_start AND p_end
      AND currency = p_currency
    GROUP BY category
  ) sub;

  RETURN QUERY SELECT
    v_income,
    v_costs,
    v_income - v_costs,
    v_income_json,
    v_costs_json,
    v_pkg_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_financial_period_summary(UUID, DATE, DATE, TEXT) TO authenticated;
