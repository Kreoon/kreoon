-- Consolidador financiero de talento: cuentas de cobro y registros de pago

-- =====================================================
-- 1. Tabla: talent_payment_accounts
-- =====================================================
CREATE TABLE IF NOT EXISTS talent_payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type text NOT NULL CHECK (account_type IN (
    'nequi','daviplata','bancolombia','otros_banco',
    'paypal','transferencia_internacional','efectivo'
  )),
  label text,
  account_number text,
  bank_name text,
  account_holder text,
  document_id text,
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 2. Tabla: talent_payments
-- =====================================================
CREATE TABLE IF NOT EXISTS talent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_account_id uuid REFERENCES talent_payment_accounts(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'COP',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','cancelled')),
  description text,
  content_ids uuid[],
  receipt_url text,
  payment_date timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 3. RLS
-- =====================================================
ALTER TABLE talent_payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_access_payment_accounts" ON talent_payment_accounts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org_member_access_payments" ON talent_payments
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. Índices
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_talent_payment_accounts_user
  ON talent_payment_accounts(organization_id, user_id);

CREATE INDEX IF NOT EXISTS idx_talent_payments_user
  ON talent_payments(organization_id, user_id);

CREATE INDEX IF NOT EXISTS idx_talent_payments_status
  ON talent_payments(organization_id, status);

-- =====================================================
-- 5. Bucket de Storage para comprobantes
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "org_member_receipts_access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'payment-receipts'
    AND auth.uid() IN (
      SELECT user_id FROM organization_members
      WHERE organization_id::text = (storage.foldername(name))[1]
    )
  );
