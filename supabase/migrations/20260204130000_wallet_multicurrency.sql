-- =====================================================
-- KREOON WALLET - MULTI-CURRENCY EXTENSION
-- Phase 4: Currency conversion and payment providers
-- =====================================================

-- Tabla de monedas soportadas
CREATE TABLE IF NOT EXISTS supported_currencies (
    code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    decimal_places INT DEFAULT 2,
    country VARCHAR(100),
    flag_emoji VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    min_withdrawal DECIMAL(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar monedas base
INSERT INTO supported_currencies (code, name, symbol, country, flag_emoji, min_withdrawal) VALUES
('USD', 'Dólar Estadounidense', '$', 'Estados Unidos', '🇺🇸', 50.00),
('COP', 'Peso Colombiano', '$', 'Colombia', '🇨🇴', 200000.00),
('MXN', 'Peso Mexicano', '$', 'México', '🇲🇽', 1000.00),
('PEN', 'Sol Peruano', 'S/', 'Perú', '🇵🇪', 200.00),
('CLP', 'Peso Chileno', '$', 'Chile', '🇨🇱', 50000.00),
('ARS', 'Peso Argentino', '$', 'Argentina', '🇦🇷', 50000.00),
('BRL', 'Real Brasileño', 'R$', 'Brasil', '🇧🇷', 250.00),
('EUR', 'Euro', '€', 'Europa', '🇪🇺', 50.00)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    symbol = EXCLUDED.symbol,
    flag_emoji = EXCLUDED.flag_emoji,
    min_withdrawal = EXCLUDED.min_withdrawal;

-- Tabla de tasas de cambio (historial)
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency VARCHAR(3) NOT NULL REFERENCES supported_currencies(code),
    to_currency VARCHAR(3) NOT NULL REFERENCES supported_currencies(code),
    rate DECIMAL(18,8) NOT NULL,
    spread DECIMAL(5,4) DEFAULT 0.02,
    source VARCHAR(50) DEFAULT 'exchangerate-api',
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,

    CONSTRAINT different_currencies CHECK (from_currency != to_currency)
);

-- Índice para búsqueda rápida de tasa actual
CREATE INDEX IF NOT EXISTS idx_exchange_rates_current
ON exchange_rates(from_currency, to_currency, fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_expires
ON exchange_rates(expires_at) WHERE expires_at IS NOT NULL;

-- Tabla de proveedores de pago (pasarelas)
CREATE TABLE IF NOT EXISTS payment_providers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'both')),

    -- Configuración
    supported_currencies TEXT[] DEFAULT ARRAY['USD'],
    supported_countries TEXT[] DEFAULT ARRAY['*'],

    -- Fees
    fixed_fee DECIMAL(10,2) DEFAULT 0,
    percentage_fee DECIMAL(5,4) DEFAULT 0,

    -- Límites
    min_amount DECIMAL(12,2),
    max_amount DECIMAL(12,2),

    -- Estado
    is_active BOOLEAN DEFAULT true,
    priority INT DEFAULT 0,

    -- Credenciales (referencia a secrets)
    credentials_key VARCHAR(100),

    -- Metadata
    logo_url TEXT,
    description TEXT,
    processing_time VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar proveedores de pago
INSERT INTO payment_providers (id, name, type, supported_currencies, supported_countries, fixed_fee, percentage_fee, processing_time, priority, description) VALUES
-- Depósitos (marcas pagan)
('stripe', 'Stripe', 'deposit', ARRAY['USD','EUR'], ARRAY['US','CO','MX','PE','CL','AR','BR'], 0.30, 0.029, 'Inmediato', 1, 'Tarjetas de crédito/débito internacionales'),
('payu', 'PayU', 'deposit', ARRAY['COP','MXN','PEN','CLP','ARS','BRL'], ARRAY['CO','MX','PE','CL','AR','BR'], 0, 0.035, 'Inmediato', 2, 'Pagos locales LATAM'),
('mercadopago', 'Mercado Pago', 'deposit', ARRAY['COP','MXN','ARS','BRL','CLP','PEN'], ARRAY['CO','MX','AR','BR','CL','PE'], 0, 0.0399, 'Inmediato', 3, 'Pagos con Mercado Pago'),

-- Retiros globales
('payoneer', 'Payoneer', 'withdrawal', ARRAY['USD'], ARRAY['*'], 2.00, 0.02, '1-2 días hábiles', 1, 'Retiros internacionales a cuenta Payoneer'),
('wise', 'Wise', 'withdrawal', ARRAY['USD','EUR','COP','MXN','PEN','CLP','BRL'], ARRAY['*'], 0, 0.015, '1-3 días hábiles', 2, 'Transferencias internacionales con mejor tasa'),
('paypal', 'PayPal', 'withdrawal', ARRAY['USD','EUR'], ARRAY['*'], 0, 0.02, '1-3 días hábiles', 3, 'Retiro a cuenta PayPal'),

-- Colombia
('bancolombia', 'Bancolombia', 'withdrawal', ARRAY['COP'], ARRAY['CO'], 5000, 0, '1-2 días hábiles', 10, 'Transferencia bancaria Colombia'),
('nequi', 'Nequi', 'withdrawal', ARRAY['COP'], ARRAY['CO'], 0, 0, '1-24 horas', 11, 'Retiro instantáneo a Nequi'),
('daviplata', 'Daviplata', 'withdrawal', ARRAY['COP'], ARRAY['CO'], 0, 0, '1-24 horas', 12, 'Retiro instantáneo a Daviplata'),

-- México
('spei', 'SPEI', 'withdrawal', ARRAY['MXN'], ARRAY['MX'], 0, 0, '1-24 horas', 20, 'Transferencia SPEI México'),
('oxxo', 'OXXO', 'withdrawal', ARRAY['MXN'], ARRAY['MX'], 15, 0, '1-3 días', 21, 'Retiro en tiendas OXXO'),

-- Perú
('bcp', 'BCP', 'withdrawal', ARRAY['PEN'], ARRAY['PE'], 5, 0, '1-2 días hábiles', 30, 'Transferencia BCP Perú'),
('interbank', 'Interbank', 'withdrawal', ARRAY['PEN'], ARRAY['PE'], 5, 0, '1-2 días hábiles', 31, 'Transferencia Interbank Perú'),
('yape', 'Yape', 'withdrawal', ARRAY['PEN'], ARRAY['PE'], 0, 0, '1-24 horas', 32, 'Retiro instantáneo a Yape'),

-- Chile
('banco_chile', 'Banco de Chile', 'withdrawal', ARRAY['CLP'], ARRAY['CL'], 0, 0, '1-2 días hábiles', 40, 'Transferencia bancaria Chile'),

-- Crypto (futuro)
('usdt_trc20', 'USDT (TRC20)', 'both', ARRAY['USD'], ARRAY['*'], 1, 0, '10-30 minutos', 50, 'Stablecoin USDT red Tron')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    supported_currencies = EXCLUDED.supported_currencies,
    supported_countries = EXCLUDED.supported_countries,
    fixed_fee = EXCLUDED.fixed_fee,
    percentage_fee = EXCLUDED.percentage_fee,
    processing_time = EXCLUDED.processing_time,
    description = EXCLUDED.description;

-- Tabla de conversiones realizadas (auditoría)
CREATE TABLE IF NOT EXISTS currency_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Contexto
    wallet_id UUID REFERENCES wallets(id),
    transaction_id UUID REFERENCES wallet_transactions(id),
    withdrawal_id UUID REFERENCES withdrawal_requests(id),

    -- Montos
    from_currency VARCHAR(3) NOT NULL REFERENCES supported_currencies(code),
    from_amount DECIMAL(12,2) NOT NULL,
    to_currency VARCHAR(3) NOT NULL REFERENCES supported_currencies(code),
    to_amount DECIMAL(12,2) NOT NULL,

    -- Tasa aplicada
    exchange_rate DECIMAL(18,8) NOT NULL,
    rate_id UUID REFERENCES exchange_rates(id),
    spread_applied DECIMAL(5,4),

    -- Fees de conversión
    conversion_fee DECIMAL(12,2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_currency_conversions_wallet
ON currency_conversions(wallet_id);

CREATE INDEX IF NOT EXISTS idx_currency_conversions_withdrawal
ON currency_conversions(withdrawal_id);

-- Actualizar tabla withdrawal_requests para multi-moneda
ALTER TABLE withdrawal_requests
ADD COLUMN IF NOT EXISTS requested_currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE withdrawal_requests
ADD COLUMN IF NOT EXISTS requested_amount_local DECIMAL(12,2);

ALTER TABLE withdrawal_requests
ADD COLUMN IF NOT EXISTS exchange_rate_applied DECIMAL(18,8);

ALTER TABLE withdrawal_requests
ADD COLUMN IF NOT EXISTS conversion_id UUID;

ALTER TABLE withdrawal_requests
ADD COLUMN IF NOT EXISTS provider_id VARCHAR(50);

ALTER TABLE withdrawal_requests
ADD COLUMN IF NOT EXISTS external_reference VARCHAR(255);

-- Actualizar payment_methods para incluir país/moneda/proveedor
ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS country VARCHAR(2);

ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS provider_id VARCHAR(50);

-- Configuración de wallet para moneda preferida
ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS preferred_currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS country VARCHAR(2);

-- =====================================================
-- FUNCIONES
-- =====================================================

-- Función para obtener tasa de cambio actual
CREATE OR REPLACE FUNCTION get_current_exchange_rate(
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3)
) RETURNS TABLE (
    rate DECIMAL(18,8),
    rate_with_spread DECIMAL(18,8),
    spread DECIMAL(5,4),
    expires_at TIMESTAMPTZ,
    rate_id UUID
) AS $$
BEGIN
    IF p_from_currency = p_to_currency THEN
        RETURN QUERY SELECT
            1::DECIMAL(18,8) as rate,
            1::DECIMAL(18,8) as rate_with_spread,
            0::DECIMAL(5,4) as spread,
            NULL::TIMESTAMPTZ as expires_at,
            NULL::UUID as rate_id;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        er.rate,
        ROUND(er.rate * (1 - er.spread), 8) as rate_with_spread,
        er.spread,
        er.expires_at,
        er.id as rate_id
    FROM exchange_rates er
    WHERE er.from_currency = p_from_currency
      AND er.to_currency = p_to_currency
      AND (er.expires_at IS NULL OR er.expires_at > NOW())
    ORDER BY er.fetched_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Función para convertir monto
CREATE OR REPLACE FUNCTION convert_currency(
    p_amount DECIMAL(12,2),
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3),
    p_apply_spread BOOLEAN DEFAULT true
) RETURNS DECIMAL(12,2) AS $$
DECLARE
    v_rate DECIMAL(18,8);
    v_spread DECIMAL(5,4);
BEGIN
    IF p_from_currency = p_to_currency THEN
        RETURN p_amount;
    END IF;

    SELECT rate, spread INTO v_rate, v_spread
    FROM exchange_rates
    WHERE from_currency = p_from_currency
      AND to_currency = p_to_currency
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY fetched_at DESC
    LIMIT 1;

    IF v_rate IS NULL THEN
        RAISE EXCEPTION 'No exchange rate found for % to %', p_from_currency, p_to_currency;
    END IF;

    IF p_apply_spread THEN
        RETURN ROUND(p_amount * v_rate * (1 - v_spread), 2);
    ELSE
        RETURN ROUND(p_amount * v_rate, 2);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular fee de retiro por proveedor
CREATE OR REPLACE FUNCTION calculate_provider_fee(
    p_amount DECIMAL(12,2),
    p_provider_id VARCHAR(50)
) RETURNS DECIMAL(12,2) AS $$
DECLARE
    v_fixed_fee DECIMAL(10,2);
    v_percentage_fee DECIMAL(5,4);
BEGIN
    SELECT fixed_fee, percentage_fee INTO v_fixed_fee, v_percentage_fee
    FROM payment_providers
    WHERE id = p_provider_id AND is_active = true;

    IF v_fixed_fee IS NULL THEN
        RETURN 0;
    END IF;

    RETURN ROUND(v_fixed_fee + (p_amount * v_percentage_fee), 2);
END;
$$ LANGUAGE plpgsql;

-- Función para obtener proveedores disponibles
CREATE OR REPLACE FUNCTION get_available_providers(
    p_country VARCHAR(2),
    p_currency VARCHAR(3),
    p_type VARCHAR(20) DEFAULT 'withdrawal'
) RETURNS TABLE (
    id VARCHAR(50),
    name VARCHAR(100),
    fixed_fee DECIMAL(10,2),
    percentage_fee DECIMAL(5,4),
    min_amount DECIMAL(12,2),
    max_amount DECIMAL(12,2),
    processing_time VARCHAR(100),
    description TEXT,
    logo_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pp.id,
        pp.name,
        pp.fixed_fee,
        pp.percentage_fee,
        pp.min_amount,
        pp.max_amount,
        pp.processing_time,
        pp.description,
        pp.logo_url
    FROM payment_providers pp
    WHERE pp.is_active = true
      AND pp.type IN (p_type, 'both')
      AND (pp.supported_countries @> ARRAY[p_country] OR pp.supported_countries @> ARRAY['*'])
      AND pp.supported_currencies @> ARRAY[p_currency]
    ORDER BY pp.priority ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE supported_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_conversions ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública para tablas de referencia
CREATE POLICY "Anyone can read supported currencies"
ON supported_currencies FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can read exchange rates"
ON exchange_rates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can read payment providers"
ON payment_providers FOR SELECT
TO authenticated
USING (true);

-- Políticas para conversiones (solo el dueño del wallet puede ver)
CREATE POLICY "Users can view their currency conversions"
ON currency_conversions FOR SELECT
TO authenticated
USING (
    wallet_id IN (
        SELECT id FROM wallets WHERE user_id = auth.uid()
    )
);

-- Service role puede insertar (desde Edge Functions)
CREATE POLICY "Service role can insert exchange rates"
ON exchange_rates FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can insert conversions"
ON currency_conversions FOR INSERT
TO service_role
WITH CHECK (true);

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT ON supported_currencies TO authenticated;
GRANT SELECT ON exchange_rates TO authenticated;
GRANT SELECT ON payment_providers TO authenticated;
GRANT SELECT ON currency_conversions TO authenticated;
GRANT ALL ON currency_conversions TO service_role;
GRANT ALL ON exchange_rates TO service_role;
