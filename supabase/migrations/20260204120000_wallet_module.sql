-- =====================================================
-- MÓDULO WALLET - SISTEMA DE PAGOS Y ESCROW KREOON
-- "La Caja Fuerte del Estudio"
-- =====================================================

-- =====================================================
-- 1. TABLA WALLETS - Billeteras de usuarios y organizaciones
-- =====================================================
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Propietario (uno de estos debe estar presente)
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Tipo de wallet
  wallet_type TEXT NOT NULL CHECK (wallet_type IN (
    'creator',      -- Creadores individuales
    'editor',       -- Editores
    'brand',        -- Marcas
    'agency',       -- Agencias (wallet principal)
    'agency_pool',  -- Pool de agencia para pagar a su equipo
    'platform'      -- Wallet de la plataforma para fees
  )),

  -- Balances (en centavos para evitar problemas de precisión)
  available_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  pending_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,    -- Escrow esperando aprobación
  reserved_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,   -- Reservado para campañas activas

  currency TEXT NOT NULL DEFAULT 'USD',

  -- Estado
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'suspended')),

  -- Configuración
  settings JSONB NOT NULL DEFAULT '{
    "auto_withdraw_threshold": null,
    "preferred_payment_method": null,
    "notifications": true
  }'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT wallet_owner_check CHECK (
    (user_id IS NOT NULL AND organization_id IS NULL) OR
    (user_id IS NULL AND organization_id IS NOT NULL)
  ),
  CONSTRAINT positive_balances CHECK (
    available_balance >= 0 AND
    pending_balance >= 0 AND
    reserved_balance >= 0
  )
);

-- Un usuario solo puede tener un wallet por tipo
CREATE UNIQUE INDEX idx_wallets_user_type ON public.wallets(user_id, wallet_type) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_wallets_org_type ON public.wallets(organization_id, wallet_type) WHERE organization_id IS NOT NULL;

COMMENT ON TABLE public.wallets IS 'Billeteras de usuarios y organizaciones para gestión de fondos';
COMMENT ON COLUMN public.wallets.available_balance IS 'Balance disponible para retiro o uso';
COMMENT ON COLUMN public.wallets.pending_balance IS 'Fondos en proceso de retiro o liberación';
COMMENT ON COLUMN public.wallets.reserved_balance IS 'Fondos reservados para escrows activos';

-- =====================================================
-- 2. TABLA WALLET_TRANSACTIONS - Historial de transacciones
-- =====================================================
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,

  -- Tipo de transacción
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'deposit',           -- Depósito externo
    'withdrawal',        -- Retiro
    'transfer_in',       -- Transferencia recibida
    'transfer_out',      -- Transferencia enviada
    'escrow_hold',       -- Fondos congelados para campaña
    'escrow_release',    -- Liberación de escrow (aprobación)
    'escrow_refund',     -- Devolución de escrow (rechazo/cancelación)
    'payment_received',  -- Pago recibido por trabajo
    'platform_fee',      -- Comisión de plataforma
    'adjustment'         -- Ajuste manual por admin
  )),

  -- Montos
  amount NUMERIC(12,2) NOT NULL,
  fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  net_amount NUMERIC(12,2) NOT NULL,

  -- Balance después de la transacción
  balance_after NUMERIC(12,2) NOT NULL,

  -- Referencias
  reference_type TEXT, -- 'campaign', 'content', 'transfer', 'withdrawal', 'escrow'
  reference_id UUID,

  -- Contrapartida (para transferencias)
  counterpart_wallet_id UUID REFERENCES public.wallets(id),
  counterpart_transaction_id UUID,

  -- Metadata
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN (
    'pending', 'completed', 'failed', 'cancelled', 'reversed'
  )),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.wallet_transactions IS 'Historial completo de todas las transacciones de wallets';
COMMENT ON COLUMN public.wallet_transactions.net_amount IS 'Monto después de comisiones (amount - fee)';
COMMENT ON COLUMN public.wallet_transactions.balance_after IS 'Balance del wallet después de esta transacción';

-- =====================================================
-- 3. TABLA ESCROW_HOLDS - Sistema de Escrow para campañas
-- =====================================================
CREATE TABLE public.escrow_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referencias al contenido/campaña
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,

  -- Organización propietaria del escrow
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Wallets involucrados
  payer_wallet_id UUID NOT NULL REFERENCES public.wallets(id),  -- Quien paga (marca/agencia)
  creator_wallet_id UUID REFERENCES public.wallets(id),          -- Creador asignado
  editor_wallet_id UUID REFERENCES public.wallets(id),           -- Editor (asignado después)

  -- Distribución de montos
  total_amount NUMERIC(12,2) NOT NULL,
  creator_amount NUMERIC(12,2),
  editor_amount NUMERIC(12,2),
  platform_fee NUMERIC(12,2),

  -- Porcentajes configurados
  creator_percentage NUMERIC(5,2),
  editor_percentage NUMERIC(5,2),
  platform_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00,

  -- Estado del escrow
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',           -- Fondos congelados
    'pending_editor',   -- Esperando asignación de editor
    'pending_approval', -- Contenido entregado, esperando aprobación
    'released',         -- Liberado (aprobado)
    'partially_released', -- Liberación parcial
    'refunded',         -- Devuelto al pagador
    'disputed',         -- En disputa
    'cancelled'         -- Cancelado
  )),

  -- Timestamps importantes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  editor_assigned_at TIMESTAMPTZ,
  content_delivered_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,

  -- Notas y metadata
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Al menos una referencia debe existir
  CONSTRAINT escrow_reference_check CHECK (
    campaign_id IS NOT NULL OR content_id IS NOT NULL
  ),
  CONSTRAINT positive_amounts CHECK (
    total_amount > 0 AND
    (creator_amount IS NULL OR creator_amount >= 0) AND
    (editor_amount IS NULL OR editor_amount >= 0) AND
    (platform_fee IS NULL OR platform_fee >= 0)
  )
);

COMMENT ON TABLE public.escrow_holds IS 'Sistema de escrow para garantizar pagos de campañas y contenido';
COMMENT ON COLUMN public.escrow_holds.payer_wallet_id IS 'Wallet que realiza el pago (marca o agencia)';
COMMENT ON COLUMN public.escrow_holds.status IS 'Estado actual del escrow en el flujo de trabajo';

-- =====================================================
-- 4. TABLA WITHDRAWAL_REQUESTS - Solicitudes de retiro
-- =====================================================
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,

  -- Usuario que solicita
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  amount NUMERIC(12,2) NOT NULL,
  fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  net_amount NUMERIC(12,2) NOT NULL,

  currency TEXT NOT NULL DEFAULT 'USD',

  -- Método de pago
  payment_method TEXT NOT NULL CHECK (payment_method IN (
    'bank_transfer_colombia',
    'bank_transfer_international',
    'paypal',
    'payoneer',
    'nequi',
    'daviplata',
    'crypto',
    'zelle',
    'wise'
  )),

  -- Datos del pago (sensibles - considerar encriptación en producción)
  payment_details JSONB NOT NULL,  -- Cuenta bancaria, email PayPal, etc.

  -- Estado
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Esperando revisión
    'processing',   -- En proceso de pago
    'completed',    -- Pagado
    'rejected',     -- Rechazado
    'cancelled'     -- Cancelado por el usuario
  )),

  -- Procesamiento
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Comprobante de pago
  payment_proof_url TEXT,
  external_reference TEXT,  -- Referencia del banco/PayPal

  -- Transacción asociada
  transaction_id UUID REFERENCES public.wallet_transactions(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT positive_withdrawal CHECK (amount > 0 AND net_amount > 0)
);

COMMENT ON TABLE public.withdrawal_requests IS 'Solicitudes de retiro de fondos pendientes de aprobación';
COMMENT ON COLUMN public.withdrawal_requests.payment_details IS 'Datos de pago del usuario - manejar con cuidado';

-- =====================================================
-- 5. TABLA WALLET_TRANSFERS - Transferencias entre wallets
-- =====================================================
CREATE TABLE public.wallet_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  from_wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  to_wallet_id UUID NOT NULL REFERENCES public.wallets(id),

  amount NUMERIC(12,2) NOT NULL,
  fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,

  -- Para agencias: puede ser pago a miembro del equipo
  transfer_type TEXT NOT NULL CHECK (transfer_type IN (
    'internal',      -- Entre wallets propios
    'team_payment',  -- Agencia a miembro
    'bonus',         -- Bonus/regalo
    'refund',        -- Devolución
    'escrow_release' -- Liberación de escrow
  )),

  description TEXT,

  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN (
    'pending', 'completed', 'failed', 'reversed'
  )),

  -- Transacciones generadas
  from_transaction_id UUID REFERENCES public.wallet_transactions(id),
  to_transaction_id UUID REFERENCES public.wallet_transactions(id),

  -- Referencia opcional
  reference_type TEXT,
  reference_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT different_wallets CHECK (from_wallet_id != to_wallet_id),
  CONSTRAINT positive_transfer CHECK (amount > 0)
);

COMMENT ON TABLE public.wallet_transfers IS 'Registro de transferencias entre wallets de la plataforma';

-- =====================================================
-- 6. TABLA PAYMENT_METHODS - Métodos de pago guardados
-- =====================================================
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  method_type TEXT NOT NULL CHECK (method_type IN (
    'bank_transfer_colombia',
    'bank_transfer_international',
    'paypal',
    'payoneer',
    'nequi',
    'daviplata',
    'crypto',
    'zelle',
    'wise'
  )),

  label TEXT NOT NULL,  -- "Mi cuenta Bancolombia", "PayPal Personal"

  -- Detalles (sensibles - considerar encriptación en producción)
  details JSONB NOT NULL,

  is_default BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.payment_methods IS 'Métodos de pago guardados por usuarios para retiros';

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX idx_wallets_user ON public.wallets(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_wallets_org ON public.wallets(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_wallets_status ON public.wallets(status);

CREATE INDEX idx_transactions_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_transactions_type ON public.wallet_transactions(transaction_type);
CREATE INDEX idx_transactions_reference ON public.wallet_transactions(reference_type, reference_id);
CREATE INDEX idx_transactions_created ON public.wallet_transactions(created_at DESC);
CREATE INDEX idx_transactions_status ON public.wallet_transactions(status);

CREATE INDEX idx_escrow_campaign ON public.escrow_holds(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_escrow_content ON public.escrow_holds(content_id) WHERE content_id IS NOT NULL;
CREATE INDEX idx_escrow_org ON public.escrow_holds(organization_id);
CREATE INDEX idx_escrow_status ON public.escrow_holds(status);
CREATE INDEX idx_escrow_payer ON public.escrow_holds(payer_wallet_id);

CREATE INDEX idx_withdrawals_status ON public.withdrawal_requests(status);
CREATE INDEX idx_withdrawals_wallet ON public.withdrawal_requests(wallet_id);
CREATE INDEX idx_withdrawals_user ON public.withdrawal_requests(user_id);
CREATE INDEX idx_withdrawals_created ON public.withdrawal_requests(created_at DESC);

CREATE INDEX idx_transfers_from ON public.wallet_transfers(from_wallet_id);
CREATE INDEX idx_transfers_to ON public.wallet_transfers(to_wallet_id);
CREATE INDEX idx_transfers_created ON public.wallet_transfers(created_at DESC);

CREATE INDEX idx_payment_methods_user ON public.payment_methods(user_id);

-- =====================================================
-- TRIGGERS PARA updated_at
-- =====================================================
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_escrow_holds_updated_at
  BEFORE UPDATE ON public.escrow_holds
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS - WALLETS
-- =====================================================

-- Usuarios pueden ver su propio wallet
CREATE POLICY "Users can view own wallet"
  ON public.wallets FOR SELECT
  USING (user_id = auth.uid());

-- Miembros de org pueden ver wallets de la org
CREATE POLICY "Org members can view org wallets"
  ON public.wallets FOR SELECT
  USING (
    organization_id IS NOT NULL AND
    public.is_org_member(auth.uid(), organization_id)
  );

-- Solo el sistema puede crear/modificar wallets (via service role)
CREATE POLICY "Service role can manage wallets"
  ON public.wallets FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- POLÍTICAS RLS - WALLET_TRANSACTIONS
-- =====================================================

-- Usuarios pueden ver transacciones de sus wallets
CREATE POLICY "Users can view own transactions"
  ON public.wallet_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wallets w
      WHERE w.id = wallet_id AND w.user_id = auth.uid()
    )
  );

-- Miembros de org pueden ver transacciones de wallets de la org
CREATE POLICY "Org members can view org wallet transactions"
  ON public.wallet_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wallets w
      WHERE w.id = wallet_id
      AND w.organization_id IS NOT NULL
      AND public.is_org_member(auth.uid(), w.organization_id)
    )
  );

-- Solo el sistema puede crear transacciones
CREATE POLICY "Service role can manage transactions"
  ON public.wallet_transactions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- POLÍTICAS RLS - ESCROW_HOLDS
-- =====================================================

-- Miembros de org pueden ver escrows de su org
CREATE POLICY "Org members can view escrows"
  ON public.escrow_holds FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- Configuradores pueden crear escrows
CREATE POLICY "Org configurers can create escrows"
  ON public.escrow_holds FOR INSERT
  WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));

-- Configuradores pueden actualizar escrows
CREATE POLICY "Org configurers can update escrows"
  ON public.escrow_holds FOR UPDATE
  USING (public.is_org_configurer(auth.uid(), organization_id))
  WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));

-- Service role tiene acceso completo
CREATE POLICY "Service role can manage escrows"
  ON public.escrow_holds FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- POLÍTICAS RLS - WITHDRAWAL_REQUESTS
-- =====================================================

-- Usuarios pueden ver sus propias solicitudes
CREATE POLICY "Users can view own withdrawals"
  ON public.withdrawal_requests FOR SELECT
  USING (user_id = auth.uid());

-- Usuarios pueden crear solicitudes para sus wallets
CREATE POLICY "Users can create withdrawal requests"
  ON public.withdrawal_requests FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.wallets w
      WHERE w.id = wallet_id AND w.user_id = auth.uid()
    )
  );

-- Usuarios pueden cancelar sus propias solicitudes pendientes
CREATE POLICY "Users can cancel own pending withdrawals"
  ON public.withdrawal_requests FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'cancelled');

-- Admins pueden ver todas las solicitudes (para procesamiento)
CREATE POLICY "Admins can view all withdrawals"
  ON public.withdrawal_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Admins pueden procesar solicitudes
CREATE POLICY "Admins can process withdrawals"
  ON public.withdrawal_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Service role tiene acceso completo
CREATE POLICY "Service role can manage withdrawals"
  ON public.withdrawal_requests FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- POLÍTICAS RLS - WALLET_TRANSFERS
-- =====================================================

-- Usuarios pueden ver transferencias de sus wallets
CREATE POLICY "Users can view own transfers"
  ON public.wallet_transfers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wallets w
      WHERE (w.id = from_wallet_id OR w.id = to_wallet_id)
      AND w.user_id = auth.uid()
    )
  );

-- Service role puede gestionar transferencias
CREATE POLICY "Service role can manage transfers"
  ON public.wallet_transfers FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- POLÍTICAS RLS - PAYMENT_METHODS
-- =====================================================

-- Usuarios pueden ver sus métodos de pago
CREATE POLICY "Users can view own payment methods"
  ON public.payment_methods FOR SELECT
  USING (user_id = auth.uid());

-- Usuarios pueden crear sus métodos de pago
CREATE POLICY "Users can create payment methods"
  ON public.payment_methods FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Usuarios pueden actualizar sus métodos de pago
CREATE POLICY "Users can update own payment methods"
  ON public.payment_methods FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Usuarios pueden eliminar sus métodos de pago
CREATE POLICY "Users can delete own payment methods"
  ON public.payment_methods FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- FUNCIONES HELPER PARA OPERACIONES ATÓMICAS
-- =====================================================

-- Función para crear un wallet si no existe
CREATE OR REPLACE FUNCTION public.ensure_user_wallet(
  p_user_id UUID,
  p_wallet_type TEXT DEFAULT 'creator'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Intentar obtener wallet existente
  SELECT id INTO v_wallet_id
  FROM public.wallets
  WHERE user_id = p_user_id AND wallet_type = p_wallet_type;

  -- Si no existe, crear uno nuevo
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id, wallet_type)
    VALUES (p_user_id, p_wallet_type)
    RETURNING id INTO v_wallet_id;
  END IF;

  RETURN v_wallet_id;
END;
$$;

-- Función para crear un escrow y reservar fondos (atómica)
CREATE OR REPLACE FUNCTION public.create_escrow_hold(
  p_payer_wallet_id UUID,
  p_organization_id UUID,
  p_content_id UUID DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL,
  p_total_amount NUMERIC(12,2) DEFAULT 0,
  p_creator_percentage NUMERIC(5,2) DEFAULT 70.00,
  p_editor_percentage NUMERIC(5,2) DEFAULT 20.00,
  p_platform_percentage NUMERIC(5,2) DEFAULT 10.00
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escrow_id UUID;
  v_available_balance NUMERIC(12,2);
  v_creator_amount NUMERIC(12,2);
  v_editor_amount NUMERIC(12,2);
  v_platform_fee NUMERIC(12,2);
BEGIN
  -- Verificar balance disponible
  SELECT available_balance INTO v_available_balance
  FROM public.wallets
  WHERE id = p_payer_wallet_id
  FOR UPDATE; -- Lock the row

  IF v_available_balance < p_total_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_available_balance, p_total_amount;
  END IF;

  -- Calcular distribución
  v_platform_fee := ROUND(p_total_amount * (p_platform_percentage / 100), 2);
  v_creator_amount := ROUND((p_total_amount - v_platform_fee) * (p_creator_percentage / (p_creator_percentage + p_editor_percentage)), 2);
  v_editor_amount := p_total_amount - v_platform_fee - v_creator_amount;

  -- Crear el escrow
  INSERT INTO public.escrow_holds (
    organization_id, payer_wallet_id, content_id, campaign_id,
    total_amount, creator_amount, editor_amount, platform_fee,
    creator_percentage, editor_percentage, platform_percentage,
    status
  )
  VALUES (
    p_organization_id, p_payer_wallet_id, p_content_id, p_campaign_id,
    p_total_amount, v_creator_amount, v_editor_amount, v_platform_fee,
    p_creator_percentage, p_editor_percentage, p_platform_percentage,
    'active'
  )
  RETURNING id INTO v_escrow_id;

  -- Mover fondos de available a reserved
  UPDATE public.wallets
  SET
    available_balance = available_balance - p_total_amount,
    reserved_balance = reserved_balance + p_total_amount,
    updated_at = NOW()
  WHERE id = p_payer_wallet_id;

  -- Registrar transacción
  INSERT INTO public.wallet_transactions (
    wallet_id, transaction_type, amount, fee, net_amount,
    balance_after, reference_type, reference_id, description, status
  )
  SELECT
    p_payer_wallet_id,
    'escrow_hold',
    p_total_amount,
    0,
    p_total_amount,
    available_balance,
    'escrow',
    v_escrow_id,
    'Fondos reservados para escrow',
    'completed'
  FROM public.wallets WHERE id = p_payer_wallet_id;

  RETURN v_escrow_id;
END;
$$;

-- Función para liberar un escrow y distribuir fondos (atómica)
CREATE OR REPLACE FUNCTION public.release_escrow(
  p_escrow_id UUID,
  p_platform_wallet_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escrow RECORD;
  v_payer_balance NUMERIC(12,2);
BEGIN
  -- Obtener datos del escrow con lock
  SELECT * INTO v_escrow
  FROM public.escrow_holds
  WHERE id = p_escrow_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escrow not found: %', p_escrow_id;
  END IF;

  IF v_escrow.status NOT IN ('active', 'pending_approval') THEN
    RAISE EXCEPTION 'Cannot release escrow in status: %', v_escrow.status;
  END IF;

  IF v_escrow.creator_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Creator wallet not assigned to escrow';
  END IF;

  -- 1. Reducir reserved_balance del pagador
  UPDATE public.wallets
  SET
    reserved_balance = reserved_balance - v_escrow.total_amount,
    updated_at = NOW()
  WHERE id = v_escrow.payer_wallet_id;

  -- 2. Pagar al creador
  UPDATE public.wallets
  SET
    available_balance = available_balance + v_escrow.creator_amount,
    updated_at = NOW()
  WHERE id = v_escrow.creator_wallet_id;

  INSERT INTO public.wallet_transactions (
    wallet_id, transaction_type, amount, fee, net_amount,
    balance_after, reference_type, reference_id, description, status
  )
  SELECT
    v_escrow.creator_wallet_id,
    'payment_received',
    v_escrow.creator_amount,
    0,
    v_escrow.creator_amount,
    available_balance,
    'escrow',
    p_escrow_id,
    'Pago por contenido aprobado',
    'completed'
  FROM public.wallets WHERE id = v_escrow.creator_wallet_id;

  -- 3. Pagar al editor (si existe)
  IF v_escrow.editor_wallet_id IS NOT NULL AND v_escrow.editor_amount > 0 THEN
    UPDATE public.wallets
    SET
      available_balance = available_balance + v_escrow.editor_amount,
      updated_at = NOW()
    WHERE id = v_escrow.editor_wallet_id;

    INSERT INTO public.wallet_transactions (
      wallet_id, transaction_type, amount, fee, net_amount,
      balance_after, reference_type, reference_id, description, status
    )
    SELECT
      v_escrow.editor_wallet_id,
      'payment_received',
      v_escrow.editor_amount,
      0,
      v_escrow.editor_amount,
      available_balance,
      'escrow',
      p_escrow_id,
      'Pago por edición aprobada',
      'completed'
    FROM public.wallets WHERE id = v_escrow.editor_wallet_id;
  END IF;

  -- 4. Platform fee (si se proporciona wallet)
  IF p_platform_wallet_id IS NOT NULL AND v_escrow.platform_fee > 0 THEN
    UPDATE public.wallets
    SET
      available_balance = available_balance + v_escrow.platform_fee,
      updated_at = NOW()
    WHERE id = p_platform_wallet_id;

    INSERT INTO public.wallet_transactions (
      wallet_id, transaction_type, amount, fee, net_amount,
      balance_after, reference_type, reference_id, description, status
    )
    SELECT
      p_platform_wallet_id,
      'platform_fee',
      v_escrow.platform_fee,
      0,
      v_escrow.platform_fee,
      available_balance,
      'escrow',
      p_escrow_id,
      'Comisión de plataforma',
      'completed'
    FROM public.wallets WHERE id = p_platform_wallet_id;
  END IF;

  -- 5. Actualizar estado del escrow
  UPDATE public.escrow_holds
  SET
    status = 'released',
    released_at = NOW(),
    updated_at = NOW()
  WHERE id = p_escrow_id;

  RETURN TRUE;
END;
$$;

-- Función para reembolsar un escrow (cancelación/rechazo)
CREATE OR REPLACE FUNCTION public.refund_escrow(
  p_escrow_id UUID,
  p_reason TEXT DEFAULT 'Cancelled'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escrow RECORD;
BEGIN
  -- Obtener datos del escrow con lock
  SELECT * INTO v_escrow
  FROM public.escrow_holds
  WHERE id = p_escrow_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escrow not found: %', p_escrow_id;
  END IF;

  IF v_escrow.status NOT IN ('active', 'pending_editor', 'pending_approval', 'disputed') THEN
    RAISE EXCEPTION 'Cannot refund escrow in status: %', v_escrow.status;
  END IF;

  -- Mover fondos de reserved a available del pagador
  UPDATE public.wallets
  SET
    reserved_balance = reserved_balance - v_escrow.total_amount,
    available_balance = available_balance + v_escrow.total_amount,
    updated_at = NOW()
  WHERE id = v_escrow.payer_wallet_id;

  -- Registrar transacción de reembolso
  INSERT INTO public.wallet_transactions (
    wallet_id, transaction_type, amount, fee, net_amount,
    balance_after, reference_type, reference_id, description, status
  )
  SELECT
    v_escrow.payer_wallet_id,
    'escrow_refund',
    v_escrow.total_amount,
    0,
    v_escrow.total_amount,
    available_balance,
    'escrow',
    p_escrow_id,
    'Reembolso de escrow: ' || p_reason,
    'completed'
  FROM public.wallets WHERE id = v_escrow.payer_wallet_id;

  -- Actualizar estado del escrow
  UPDATE public.escrow_holds
  SET
    status = 'refunded',
    notes = COALESCE(notes || E'\n', '') || 'Refunded: ' || p_reason,
    updated_at = NOW()
  WHERE id = p_escrow_id;

  RETURN TRUE;
END;
$$;

-- Función para procesar un retiro (admin)
CREATE OR REPLACE FUNCTION public.process_withdrawal(
  p_withdrawal_id UUID,
  p_admin_id UUID,
  p_status TEXT,
  p_external_reference TEXT DEFAULT NULL,
  p_payment_proof_url TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal RECORD;
BEGIN
  -- Obtener datos del retiro con lock
  SELECT * INTO v_withdrawal
  FROM public.withdrawal_requests
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found: %', p_withdrawal_id;
  END IF;

  IF v_withdrawal.status NOT IN ('pending', 'processing') THEN
    RAISE EXCEPTION 'Cannot process withdrawal in status: %', v_withdrawal.status;
  END IF;

  IF p_status = 'completed' THEN
    -- Reducir pending_balance del wallet
    UPDATE public.wallets
    SET
      pending_balance = pending_balance - v_withdrawal.amount,
      updated_at = NOW()
    WHERE id = v_withdrawal.wallet_id;

    -- Registrar transacción
    INSERT INTO public.wallet_transactions (
      wallet_id, transaction_type, amount, fee, net_amount,
      balance_after, reference_type, reference_id, description, status, processed_at
    )
    SELECT
      v_withdrawal.wallet_id,
      'withdrawal',
      v_withdrawal.amount,
      v_withdrawal.fee,
      v_withdrawal.net_amount,
      available_balance, -- El balance disponible no cambia, ya se movió a pending
      'withdrawal',
      p_withdrawal_id,
      'Retiro procesado: ' || COALESCE(p_external_reference, 'N/A'),
      'completed',
      NOW()
    FROM public.wallets WHERE id = v_withdrawal.wallet_id;

  ELSIF p_status = 'rejected' THEN
    -- Devolver fondos de pending a available
    UPDATE public.wallets
    SET
      pending_balance = pending_balance - v_withdrawal.amount,
      available_balance = available_balance + v_withdrawal.amount,
      updated_at = NOW()
    WHERE id = v_withdrawal.wallet_id;
  END IF;

  -- Actualizar el retiro
  UPDATE public.withdrawal_requests
  SET
    status = p_status,
    processed_by = p_admin_id,
    processed_at = NOW(),
    external_reference = COALESCE(p_external_reference, external_reference),
    payment_proof_url = COALESCE(p_payment_proof_url, payment_proof_url),
    rejection_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE id = p_withdrawal_id;

  RETURN TRUE;
END;
$$;

-- Función para crear una solicitud de retiro
CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
  p_wallet_id UUID,
  p_user_id UUID,
  p_amount NUMERIC(12,2),
  p_payment_method TEXT,
  p_payment_details JSONB,
  p_fee NUMERIC(12,2) DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal_id UUID;
  v_available_balance NUMERIC(12,2);
  v_net_amount NUMERIC(12,2);
BEGIN
  v_net_amount := p_amount - p_fee;

  -- Verificar balance disponible
  SELECT available_balance INTO v_available_balance
  FROM public.wallets
  WHERE id = p_wallet_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found or does not belong to user';
  END IF;

  IF v_available_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_available_balance, p_amount;
  END IF;

  -- Verificar que no hay retiros pendientes
  IF EXISTS (
    SELECT 1 FROM public.withdrawal_requests
    WHERE wallet_id = p_wallet_id AND status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'There is already a pending withdrawal request';
  END IF;

  -- Mover fondos de available a pending
  UPDATE public.wallets
  SET
    available_balance = available_balance - p_amount,
    pending_balance = pending_balance + p_amount,
    updated_at = NOW()
  WHERE id = p_wallet_id;

  -- Crear la solicitud
  INSERT INTO public.withdrawal_requests (
    wallet_id, user_id, amount, fee, net_amount,
    payment_method, payment_details, status
  )
  VALUES (
    p_wallet_id, p_user_id, p_amount, p_fee, v_net_amount,
    p_payment_method, p_payment_details, 'pending'
  )
  RETURNING id INTO v_withdrawal_id;

  RETURN v_withdrawal_id;
END;
$$;

-- =====================================================
-- GRANTS PARA FUNCIONES
-- =====================================================
GRANT EXECUTE ON FUNCTION public.ensure_user_wallet(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_withdrawal_request(UUID, UUID, NUMERIC, TEXT, JSONB, NUMERIC) TO authenticated;

-- Funciones de admin solo para service_role
GRANT EXECUTE ON FUNCTION public.create_escrow_hold(UUID, UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_escrow(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_escrow(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_withdrawal(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
