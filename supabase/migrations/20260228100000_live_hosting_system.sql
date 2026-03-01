-- ============================================================================
-- KREOON LIVE HOSTING SYSTEM
-- Sistema híbrido de contratación de hosts para transmisiones en vivo
-- Migración: 20260228100000_live_hosting_system.sql
-- ============================================================================

-- ============================================================================
-- PARTE 1: ENUMS
-- ============================================================================

-- Canal de contratación
DO $$ BEGIN
    CREATE TYPE hosting_channel_type AS ENUM (
        'marketplace',     -- Canal A: Publicación abierta, creadores aplican
        'direct',          -- Canal B: Invitación directa a creador específico
        'org_managed'      -- Canal C: Organización vende a cliente, asigna creador interno
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Estado de la solicitud de hosting
DO $$ BEGIN
    CREATE TYPE hosting_request_status AS ENUM (
        'draft',               -- Borrador, no publicado
        'pending_payment',     -- Esperando pago/escrow
        'open',                -- Publicado, aceptando aplicaciones (marketplace)
        'reviewing',           -- Revisando aplicaciones
        'host_selected',       -- Host seleccionado, pendiente confirmación
        'negotiating',         -- En negociación (direct)
        'confirmed',           -- Host confirmado, esperando live
        'in_progress',         -- Live en curso
        'completed',           -- Live finalizado exitosamente
        'cancelled',           -- Cancelado
        'disputed'             -- En disputa
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Estado del host en la solicitud
DO $$ BEGIN
    CREATE TYPE hosting_host_status AS ENUM (
        'invited',             -- Invitado (direct)
        'applied',             -- Aplicó (marketplace)
        'shortlisted',         -- Preseleccionado
        'selected',            -- Seleccionado
        'counter_offered',     -- Envió contraoferta
        'negotiating',         -- En negociación
        'confirmed',           -- Confirmado
        'rejected',            -- Rechazado
        'withdrawn',           -- Se retiró
        'completed',           -- Completó el live
        'no_show'              -- No se presentó
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PARTE 2: TABLA live_hosting_requests
-- Solicitudes de host para transmisiones en vivo
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_hosting_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Canal de contratación
    channel hosting_channel_type NOT NULL DEFAULT 'marketplace',

    -- Relaciones organizacionales
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id),      -- Cliente externo (Canal C)
    brand_id UUID REFERENCES brands(id),        -- Marca solicitante (Canal A/B)
    created_by UUID NOT NULL REFERENCES auth.users(id),

    -- Información básica
    title TEXT NOT NULL,
    description TEXT,
    requirements JSONB DEFAULT '[]'::jsonb,     -- Lista de requisitos del host
    preferred_niches TEXT[] DEFAULT '{}',       -- Nichos preferidos
    preferred_languages TEXT[] DEFAULT '{es}'::text[],

    -- Programación
    scheduled_date DATE NOT NULL,
    scheduled_time_start TIME NOT NULL,
    scheduled_time_end TIME,
    timezone TEXT DEFAULT 'America/Bogota',
    estimated_duration_minutes INTEGER DEFAULT 60,

    -- Configuración del live
    live_type streaming_session_type DEFAULT 'live_shopping',
    products_to_showcase JSONB DEFAULT '[]'::jsonb, -- IDs de productos
    target_audience TEXT,
    content_guidelines TEXT,

    -- Presupuesto y pagos
    budget_min_usd DECIMAL(10,2),
    budget_max_usd DECIMAL(10,2),
    fixed_rate_usd DECIMAL(10,2),               -- Tarifa fija acordada
    commission_on_sales_pct DECIMAL(5,2),       -- % comisión sobre ventas

    -- Comisiones de plataforma
    platform_commission_rate DECIMAL(5,4) DEFAULT 0.20,  -- 20% para A/B, 10-12% para C
    org_markup_rate DECIMAL(5,4) DEFAULT 0,              -- Solo Canal C: markup de la org
    org_markup_amount_usd DECIMAL(10,2) DEFAULT 0,

    -- Estado
    status hosting_request_status NOT NULL DEFAULT 'draft',

    -- Relaciones con otros módulos
    streaming_session_id UUID REFERENCES streaming_sessions_v2(id), -- Se crea al confirmar pago
    escrow_hold_id UUID REFERENCES escrow_holds(id),
    campaign_id UUID REFERENCES marketplace_campaigns(id),         -- Canal A: campaña asociada
    template_id UUID,                                              -- Template usado

    -- Métricas post-live
    actual_duration_minutes INTEGER,
    actual_revenue_usd DECIMAL(12,2),
    actual_orders INTEGER,
    host_rating DECIMAL(3,2),
    client_rating DECIMAL(3,2),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_live_hosting_requests_org ON live_hosting_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_live_hosting_requests_channel ON live_hosting_requests(channel);
CREATE INDEX IF NOT EXISTS idx_live_hosting_requests_status ON live_hosting_requests(status);
CREATE INDEX IF NOT EXISTS idx_live_hosting_requests_date ON live_hosting_requests(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_live_hosting_requests_brand ON live_hosting_requests(brand_id);
CREATE INDEX IF NOT EXISTS idx_live_hosting_requests_client ON live_hosting_requests(client_id);

-- ============================================================================
-- PARTE 3: TABLA live_hosting_hosts
-- Hosts asignados/aplicantes para cada solicitud
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_hosting_hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    request_id UUID NOT NULL REFERENCES live_hosting_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    creator_profile_id UUID REFERENCES creator_profiles(id),

    -- Estado
    status hosting_host_status NOT NULL DEFAULT 'applied',

    -- Propuesta económica
    proposed_rate_usd DECIMAL(10,2),            -- Tarifa propuesta por el host
    agreed_rate_usd DECIMAL(10,2),              -- Tarifa acordada final
    commission_on_sales_pct DECIMAL(5,2),       -- % comisión sobre ventas

    -- Negociación (Canal B)
    counter_offer_usd DECIMAL(10,2),
    counter_offer_message TEXT,
    counter_offer_at TIMESTAMPTZ,

    -- Aplicación (Canal A)
    application_message TEXT,
    portfolio_links TEXT[] DEFAULT '{}',
    experience_description TEXT,

    -- Evaluación
    fit_score INTEGER DEFAULT 0,                -- Score de compatibilidad 0-100
    shortlist_notes TEXT,
    rejection_reason TEXT,

    -- Post-live
    actual_performance_score DECIMAL(3,2),
    host_feedback TEXT,
    client_feedback TEXT,

    -- Pago
    payment_status TEXT DEFAULT 'pending',      -- pending, processing, paid, disputed
    payment_released_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(request_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_live_hosting_hosts_request ON live_hosting_hosts(request_id);
CREATE INDEX IF NOT EXISTS idx_live_hosting_hosts_user ON live_hosting_hosts(user_id);
CREATE INDEX IF NOT EXISTS idx_live_hosting_hosts_status ON live_hosting_hosts(status);
CREATE INDEX IF NOT EXISTS idx_live_hosting_hosts_creator_profile ON live_hosting_hosts(creator_profile_id);

-- ============================================================================
-- PARTE 4: TABLA live_hosting_status_history
-- Auditoría de cambios de estado
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_hosting_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    request_id UUID NOT NULL REFERENCES live_hosting_requests(id) ON DELETE CASCADE,
    host_id UUID REFERENCES live_hosting_hosts(id) ON DELETE CASCADE,

    -- Cambio
    entity_type TEXT NOT NULL,                  -- 'request' o 'host'
    from_status TEXT,
    to_status TEXT NOT NULL,

    -- Contexto
    changed_by UUID REFERENCES auth.users(id),
    change_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_live_hosting_history_request ON live_hosting_status_history(request_id);

-- ============================================================================
-- PARTE 5: TABLA live_hosting_templates
-- Templates reutilizables para solicitudes
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_hosting_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),

    -- Info
    name TEXT NOT NULL,
    description TEXT,

    -- Template data
    default_channel hosting_channel_type DEFAULT 'marketplace',
    default_requirements JSONB DEFAULT '[]'::jsonb,
    default_niches TEXT[] DEFAULT '{}',
    default_duration_minutes INTEGER DEFAULT 60,
    default_budget_min_usd DECIMAL(10,2),
    default_budget_max_usd DECIMAL(10,2),
    default_live_type streaming_session_type DEFAULT 'live_shopping',
    default_content_guidelines TEXT,

    -- Uso
    times_used INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_live_hosting_templates_org ON live_hosting_templates(organization_id);

-- ============================================================================
-- PARTE 6: TRIGGERS PARA TIMESTAMPS
-- ============================================================================

-- Función genérica para updated_at
CREATE OR REPLACE FUNCTION update_live_hosting_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
DROP TRIGGER IF EXISTS trg_live_hosting_requests_updated ON live_hosting_requests;
CREATE TRIGGER trg_live_hosting_requests_updated
    BEFORE UPDATE ON live_hosting_requests
    FOR EACH ROW EXECUTE FUNCTION update_live_hosting_timestamp();

DROP TRIGGER IF EXISTS trg_live_hosting_hosts_updated ON live_hosting_hosts;
CREATE TRIGGER trg_live_hosting_hosts_updated
    BEFORE UPDATE ON live_hosting_hosts
    FOR EACH ROW EXECUTE FUNCTION update_live_hosting_timestamp();

DROP TRIGGER IF EXISTS trg_live_hosting_templates_updated ON live_hosting_templates;
CREATE TRIGGER trg_live_hosting_templates_updated
    BEFORE UPDATE ON live_hosting_templates
    FOR EACH ROW EXECUTE FUNCTION update_live_hosting_timestamp();

-- ============================================================================
-- PARTE 7: TRIGGER PARA HISTORIAL DE ESTADOS
-- ============================================================================

CREATE OR REPLACE FUNCTION log_hosting_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO live_hosting_status_history (
            request_id, entity_type, from_status, to_status, metadata
        ) VALUES (
            NEW.id, 'request', OLD.status::text, NEW.status::text, '{}'::jsonb
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_hosting_request_status ON live_hosting_requests;
CREATE TRIGGER trg_log_hosting_request_status
    AFTER UPDATE ON live_hosting_requests
    FOR EACH ROW EXECUTE FUNCTION log_hosting_request_status_change();

CREATE OR REPLACE FUNCTION log_hosting_host_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO live_hosting_status_history (
            request_id, host_id, entity_type, from_status, to_status, metadata
        ) VALUES (
            NEW.request_id, NEW.id, 'host', OLD.status::text, NEW.status::text, '{}'::jsonb
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_hosting_host_status ON live_hosting_hosts;
CREATE TRIGGER trg_log_hosting_host_status
    AFTER UPDATE ON live_hosting_hosts
    FOR EACH ROW EXECUTE FUNCTION log_hosting_host_status_change();

-- ============================================================================
-- PARTE 8: TRIGGER PARA AUTO-CREAR STREAMING SESSION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_streaming_session_for_hosting()
RETURNS TRIGGER AS $$
DECLARE
    v_session_id UUID;
    v_host_user_id UUID;
    v_request RECORD;
BEGIN
    -- Solo actuar cuando escrow pasa a 'funded'
    IF NEW.status = 'funded' AND OLD.status != 'funded' AND NEW.project_type = 'live_shopping' THEN
        -- Buscar la solicitud de hosting asociada
        SELECT * INTO v_request
        FROM live_hosting_requests
        WHERE escrow_hold_id = NEW.id
        LIMIT 1;

        IF v_request IS NOT NULL AND v_request.streaming_session_id IS NULL THEN
            -- Buscar el host confirmado
            SELECT user_id INTO v_host_user_id
            FROM live_hosting_hosts
            WHERE request_id = v_request.id AND status = 'confirmed'
            LIMIT 1;

            IF v_host_user_id IS NOT NULL THEN
                -- Crear la sesión de streaming
                INSERT INTO streaming_sessions_v2 (
                    organization_id,
                    session_type,
                    title,
                    description,
                    scheduled_at,
                    status,
                    is_shopping_enabled,
                    host_user_id,
                    client_id,
                    campaign_id
                ) VALUES (
                    v_request.organization_id,
                    v_request.live_type,
                    v_request.title,
                    v_request.description,
                    (v_request.scheduled_date + v_request.scheduled_time_start)::timestamptz,
                    'scheduled',
                    true,
                    v_host_user_id,
                    v_request.client_id,
                    v_request.campaign_id
                )
                RETURNING id INTO v_session_id;

                -- Actualizar la solicitud con el ID de sesión
                UPDATE live_hosting_requests
                SET streaming_session_id = v_session_id,
                    status = 'confirmed'
                WHERE id = v_request.id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_escrow_create_streaming_session ON escrow_holds;
CREATE TRIGGER trg_escrow_create_streaming_session
    AFTER UPDATE ON escrow_holds
    FOR EACH ROW EXECUTE FUNCTION create_streaming_session_for_hosting();

-- ============================================================================
-- PARTE 9: RLS POLICIES
-- ============================================================================

ALTER TABLE live_hosting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_hosting_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_hosting_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_hosting_templates ENABLE ROW LEVEL SECURITY;

-- Policies para live_hosting_requests
CREATE POLICY "org_members_select_hosting_requests" ON live_hosting_requests
    FOR SELECT TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
        OR
        -- Hosts pueden ver solicitudes donde participan
        id IN (
            SELECT request_id FROM live_hosting_hosts
            WHERE user_id = auth.uid()
        )
        OR
        -- Solicitudes públicas de marketplace
        (channel = 'marketplace' AND status = 'open')
    );

CREATE POLICY "org_members_insert_hosting_requests" ON live_hosting_requests
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "org_members_update_hosting_requests" ON live_hosting_requests
    FOR UPDATE TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "org_members_delete_hosting_requests" ON live_hosting_requests
    FOR DELETE TO authenticated
    USING (
        created_by = auth.uid()
        OR
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Policies para live_hosting_hosts
CREATE POLICY "view_hosting_hosts" ON live_hosting_hosts
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR
        request_id IN (
            SELECT id FROM live_hosting_requests
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "apply_as_host" ON live_hosting_hosts
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        OR
        -- Org managers pueden invitar
        request_id IN (
            SELECT id FROM live_hosting_requests
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "update_hosting_hosts" ON live_hosting_hosts
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid()
        OR
        request_id IN (
            SELECT id FROM live_hosting_requests
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "delete_hosting_hosts" ON live_hosting_hosts
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()
        OR
        request_id IN (
            SELECT id FROM live_hosting_requests
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

-- Policies para live_hosting_status_history
CREATE POLICY "view_hosting_history" ON live_hosting_status_history
    FOR SELECT TO authenticated
    USING (
        request_id IN (
            SELECT id FROM live_hosting_requests
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

-- Policies para live_hosting_templates
CREATE POLICY "org_members_templates" ON live_hosting_templates
    FOR ALL TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- PARTE 10: GRANTS
-- ============================================================================

GRANT ALL ON live_hosting_requests TO authenticated;
GRANT ALL ON live_hosting_requests TO service_role;

GRANT ALL ON live_hosting_hosts TO authenticated;
GRANT ALL ON live_hosting_hosts TO service_role;

GRANT ALL ON live_hosting_status_history TO authenticated;
GRANT ALL ON live_hosting_status_history TO service_role;

GRANT ALL ON live_hosting_templates TO authenticated;
GRANT ALL ON live_hosting_templates TO service_role;

-- ============================================================================
-- PARTE 11: RPCs SECURITY DEFINER
-- ============================================================================

-- Obtener solicitudes de hosting con filtros
CREATE OR REPLACE FUNCTION get_live_hosting_requests(
    p_org_id UUID,
    p_channel hosting_channel_type DEFAULT NULL,
    p_statuses hosting_request_status[] DEFAULT NULL
)
RETURNS SETOF live_hosting_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT r.*
    FROM live_hosting_requests r
    WHERE r.organization_id = p_org_id
      AND (p_channel IS NULL OR r.channel = p_channel)
      AND (p_statuses IS NULL OR r.status = ANY(p_statuses))
    ORDER BY r.scheduled_date DESC, r.created_at DESC;
END;
$$;

-- Obtener solicitudes abiertas del marketplace para hosts
CREATE OR REPLACE FUNCTION get_marketplace_hosting_requests(
    p_niches TEXT[] DEFAULT NULL,
    p_min_budget DECIMAL DEFAULT NULL,
    p_max_budget DECIMAL DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS SETOF live_hosting_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT r.*
    FROM live_hosting_requests r
    WHERE r.channel = 'marketplace'
      AND r.status = 'open'
      AND r.scheduled_date > CURRENT_DATE
      AND (p_niches IS NULL OR r.preferred_niches && p_niches)
      AND (p_min_budget IS NULL OR COALESCE(r.budget_max_usd, r.fixed_rate_usd) >= p_min_budget)
      AND (p_max_budget IS NULL OR COALESCE(r.budget_min_usd, r.fixed_rate_usd) <= p_max_budget)
    ORDER BY r.scheduled_date ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Obtener hosts para una solicitud
CREATE OR REPLACE FUNCTION get_hosting_hosts(
    p_request_id UUID
)
RETURNS TABLE (
    id UUID,
    request_id UUID,
    user_id UUID,
    creator_profile_id UUID,
    status hosting_host_status,
    proposed_rate_usd DECIMAL,
    agreed_rate_usd DECIMAL,
    commission_on_sales_pct DECIMAL,
    counter_offer_usd DECIMAL,
    counter_offer_message TEXT,
    counter_offer_at TIMESTAMPTZ,
    application_message TEXT,
    portfolio_links TEXT[],
    experience_description TEXT,
    fit_score INTEGER,
    shortlist_notes TEXT,
    rejection_reason TEXT,
    actual_performance_score DECIMAL,
    host_feedback TEXT,
    client_feedback TEXT,
    payment_status TEXT,
    payment_released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    -- Joined fields
    full_name TEXT,
    avatar_url TEXT,
    creator_slug TEXT,
    creator_bio TEXT,
    creator_rating DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.id,
        h.request_id,
        h.user_id,
        h.creator_profile_id,
        h.status,
        h.proposed_rate_usd,
        h.agreed_rate_usd,
        h.commission_on_sales_pct,
        h.counter_offer_usd,
        h.counter_offer_message,
        h.counter_offer_at,
        h.application_message,
        h.portfolio_links,
        h.experience_description,
        h.fit_score,
        h.shortlist_notes,
        h.rejection_reason,
        h.actual_performance_score,
        h.host_feedback,
        h.client_feedback,
        h.payment_status,
        h.payment_released_at,
        h.created_at,
        h.updated_at,
        -- Joined
        p.full_name,
        p.avatar_url,
        cp.slug,
        cp.bio,
        cp.rating_average
    FROM live_hosting_hosts h
    LEFT JOIN profiles p ON p.id = h.user_id
    LEFT JOIN creator_profiles cp ON cp.id = h.creator_profile_id
    WHERE h.request_id = p_request_id
    ORDER BY h.fit_score DESC, h.created_at ASC;
END;
$$;

-- Crear sesión de streaming para una solicitud confirmada
CREATE OR REPLACE FUNCTION create_streaming_session_for_request(
    p_request_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session_id UUID;
    v_request RECORD;
    v_host_user_id UUID;
BEGIN
    -- Obtener la solicitud
    SELECT * INTO v_request
    FROM live_hosting_requests
    WHERE id = p_request_id;

    IF v_request IS NULL THEN
        RAISE EXCEPTION 'Request not found';
    END IF;

    IF v_request.streaming_session_id IS NOT NULL THEN
        RETURN v_request.streaming_session_id;
    END IF;

    -- Obtener el host confirmado
    SELECT user_id INTO v_host_user_id
    FROM live_hosting_hosts
    WHERE request_id = p_request_id AND status = 'confirmed'
    LIMIT 1;

    IF v_host_user_id IS NULL THEN
        RAISE EXCEPTION 'No confirmed host found';
    END IF;

    -- Crear la sesión
    INSERT INTO streaming_sessions_v2 (
        organization_id,
        session_type,
        title,
        description,
        scheduled_at,
        status,
        is_shopping_enabled,
        host_user_id,
        client_id,
        campaign_id
    ) VALUES (
        v_request.organization_id,
        v_request.live_type,
        v_request.title,
        v_request.description,
        (v_request.scheduled_date + v_request.scheduled_time_start)::timestamptz,
        'scheduled',
        v_request.live_type = 'live_shopping',
        v_host_user_id,
        v_request.client_id,
        v_request.campaign_id
    )
    RETURNING id INTO v_session_id;

    -- Actualizar la solicitud
    UPDATE live_hosting_requests
    SET streaming_session_id = v_session_id
    WHERE id = p_request_id;

    RETURN v_session_id;
END;
$$;

-- Completar hosting y liberar pagos
CREATE OR REPLACE FUNCTION complete_live_hosting(
    p_request_id UUID,
    p_host_rating DECIMAL DEFAULT NULL,
    p_client_rating DECIMAL DEFAULT NULL,
    p_actual_duration INTEGER DEFAULT NULL,
    p_actual_revenue DECIMAL DEFAULT NULL,
    p_actual_orders INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_host RECORD;
BEGIN
    -- Obtener solicitud
    SELECT * INTO v_request FROM live_hosting_requests WHERE id = p_request_id;

    IF v_request IS NULL THEN
        RAISE EXCEPTION 'Request not found';
    END IF;

    IF v_request.status != 'in_progress' THEN
        RAISE EXCEPTION 'Request is not in progress';
    END IF;

    -- Actualizar solicitud
    UPDATE live_hosting_requests
    SET
        status = 'completed',
        host_rating = p_host_rating,
        client_rating = p_client_rating,
        actual_duration_minutes = COALESCE(p_actual_duration, estimated_duration_minutes),
        actual_revenue_usd = p_actual_revenue,
        actual_orders = p_actual_orders
    WHERE id = p_request_id;

    -- Actualizar host
    UPDATE live_hosting_hosts
    SET
        status = 'completed',
        actual_performance_score = p_host_rating,
        payment_status = 'processing'
    WHERE request_id = p_request_id AND status = 'confirmed';

    -- Si hay escrow, marcarlo para liberación
    IF v_request.escrow_hold_id IS NOT NULL THEN
        UPDATE escrow_holds
        SET status = 'pending_approval'
        WHERE id = v_request.escrow_hold_id;
    END IF;

    RETURN TRUE;
END;
$$;

-- ============================================================================
-- PARTE 12: ACTUALIZAR constants.ts (comentario para recordar)
-- ============================================================================

-- RECORDATORIO: Agregar a src/lib/finance/constants.ts:
-- COMMISSION_RATES.live_hosting_direct = { base: 20, min: 15, max: 25 }  // Canal A/B
-- COMMISSION_RATES.live_hosting_whitelabel = { base: 12, min: 10, max: 15 }  // Canal C

-- ============================================================================
-- PARTE 13: NOTIFY PARA REFRESCAR CACHE DE POSTGREST
-- ============================================================================

NOTIFY pgrst, 'reload schema';
