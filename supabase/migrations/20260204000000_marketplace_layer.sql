-- =====================================================
-- FASE 4.5B: MARKETPLACE LAYER PARA KREOON SOCIAL
-- =====================================================
-- Este archivo crea toda la infraestructura de base de datos
-- necesaria para el marketplace de servicios creativos.
-- =====================================================

-- =====================================================
-- 1. SERVICIOS QUE OFRECEN LOS CREADORES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.creator_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Tipo de servicio
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN (
        'ugc_video',           -- Video UGC
        'ugc_photo',           -- Foto UGC
        'ugc_carousel',        -- Carrusel UGC
        'video_editing',       -- Edición de video
        'motion_graphics',     -- Motion graphics
        'thumbnail_design',    -- Diseño de thumbnails
        'social_management',   -- Gestión de redes
        'content_strategy',    -- Estrategia de contenido
        'live_streaming',      -- Lives/streaming
        'voice_over',          -- Locución
        'script_writing',      -- Guionismo
        'photography',         -- Fotografía
        'custom'               -- Servicio personalizado
    )),

    -- Detalles
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Lo que incluye (JSON array)
    deliverables JSONB DEFAULT '[]'::jsonb,

    -- Precios
    price_type VARCHAR(20) DEFAULT 'fixed' CHECK (price_type IN (
        'fixed',      -- Precio fijo
        'starting',   -- Desde X
        'hourly',     -- Por hora
        'custom'      -- A convenir
    )),
    price_amount DECIMAL(10,2),
    price_currency VARCHAR(3) DEFAULT 'USD',

    -- Tiempo de entrega
    delivery_days INT,

    -- Revisiones incluidas
    revisions_included INT DEFAULT 1,

    -- Requisitos del cliente
    requirements TEXT,

    -- Ejemplos de trabajo (IDs de content o portfolio_posts)
    portfolio_items UUID[] DEFAULT '{}',

    -- Estado
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,

    -- Orden de display
    display_order INT DEFAULT 0,

    -- Stats
    orders_count INT DEFAULT 0,
    avg_rating DECIMAL(2,1),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_services_user ON public.creator_services(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_services_type ON public.creator_services(service_type);
CREATE INDEX IF NOT EXISTS idx_creator_services_active ON public.creator_services(is_active) WHERE is_active = true;

-- =====================================================
-- 2. DISPONIBILIDAD DEL CREADOR
-- =====================================================

CREATE TABLE IF NOT EXISTS public.creator_availability (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Estado general
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN (
        'available',      -- Disponible para nuevos proyectos
        'busy',           -- Ocupado pero acepta proyectos
        'unavailable',    -- No disponible
        'vacation'        -- De vacaciones
    )),

    -- Mensaje personalizado
    status_message TEXT,

    -- Vacaciones
    vacation_until TIMESTAMPTZ,

    -- Capacidad actual
    max_concurrent_projects INT DEFAULT 3,
    current_projects_count INT DEFAULT 0,

    -- Tiempo de respuesta típico
    typical_response_hours INT DEFAULT 24,

    -- Preferencias de trabajo
    preferred_project_size VARCHAR(20) CHECK (preferred_project_size IN (
        'small',    -- < $200
        'medium',   -- $200-$1000
        'large',    -- > $1000
        'any'
    )) DEFAULT 'any',
    preferred_industries TEXT[] DEFAULT '{}',

    -- Restricciones
    do_not_work_with TEXT[] DEFAULT '{}',

    -- Auto-actualización
    auto_busy_threshold INT DEFAULT 3,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. VERIFICACIÓN PARA MARKETPLACE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.marketplace_verifications (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Estado de verificación
    verification_status VARCHAR(20) DEFAULT 'none' CHECK (verification_status IN (
        'none',
        'pending',
        'verified',
        'suspended'
    )),

    -- Nivel de verificación (0-4)
    verification_level INT DEFAULT 0,

    -- Checklist de verificación
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    identity_verified BOOLEAN DEFAULT false,
    portfolio_reviewed BOOLEAN DEFAULT false,
    interview_completed BOOLEAN DEFAULT false,

    -- Documentos
    identity_document_url TEXT,
    identity_verified_at TIMESTAMPTZ,
    identity_verified_by UUID REFERENCES public.profiles(id),

    -- Portfolio review
    portfolio_reviewed_at TIMESTAMPTZ,
    portfolio_reviewed_by UUID REFERENCES public.profiles(id),
    portfolio_notes TEXT,

    -- Scores
    quality_score DECIMAL(3,2),
    reliability_score DECIMAL(3,2),
    communication_score DECIMAL(3,2),

    -- Badges especiales (JSON array)
    badges JSONB DEFAULT '[]'::jsonb,

    -- Fechas
    verified_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,
    suspension_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. PROPUESTAS / SOLICITUDES DE TRABAJO
-- =====================================================

CREATE TABLE IF NOT EXISTS public.marketplace_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- De quién a quién
    client_id UUID NOT NULL REFERENCES public.profiles(id),
    provider_id UUID NOT NULL REFERENCES public.profiles(id),

    -- Servicio solicitado (opcional)
    service_id UUID REFERENCES public.creator_services(id),

    -- Detalles de la propuesta
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    -- Archivos adjuntos
    attachments JSONB DEFAULT '[]'::jsonb,

    -- Presupuesto propuesto
    proposed_budget DECIMAL(10,2),
    budget_currency VARCHAR(3) DEFAULT 'USD',
    budget_type VARCHAR(20) DEFAULT 'fixed' CHECK (budget_type IN (
        'fixed', 'range', 'hourly', 'open'
    )),
    budget_max DECIMAL(10,2),

    -- Fecha límite deseada
    desired_deadline TIMESTAMPTZ,

    -- Estado
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',
        'viewed',
        'interested',
        'negotiating',
        'accepted',
        'declined',
        'expired',
        'withdrawn'
    )),

    -- Respuesta del proveedor
    provider_response TEXT,
    counter_offer_amount DECIMAL(10,2),
    counter_offer_deadline TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,

    -- Si se acepta, link al contrato
    contract_id UUID,

    -- Expiración
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

    -- Tracking
    viewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_provider ON public.marketplace_proposals(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_proposals_client ON public.marketplace_proposals(client_id, status);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.marketplace_proposals(status);

-- =====================================================
-- 5. MENSAJES DE PROPUESTA (Pre-contrato)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.marketplace_proposal_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES public.marketplace_proposals(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_system_message BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_messages ON public.marketplace_proposal_messages(proposal_id, created_at);

-- =====================================================
-- 6. REVIEWS DE CONTRATOS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.marketplace_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Contrato asociado (opcional por ahora, se vinculará con marketplace_contracts)
    contract_id UUID,
    proposal_id UUID REFERENCES public.marketplace_proposals(id),

    -- Quién hace la review
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
    reviewer_type VARCHAR(10) NOT NULL CHECK (reviewer_type IN ('client', 'provider')),

    -- A quién se le hace la review
    reviewed_id UUID NOT NULL REFERENCES public.profiles(id),

    -- Ratings (1-5)
    overall_rating INT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),

    -- Ratings específicos
    quality_rating INT CHECK (quality_rating BETWEEN 1 AND 5),
    communication_rating INT CHECK (communication_rating BETWEEN 1 AND 5),
    timeliness_rating INT CHECK (timeliness_rating BETWEEN 1 AND 5),
    value_rating INT CHECK (value_rating BETWEEN 1 AND 5),

    -- Texto de la review
    review_text TEXT,

    -- Respuesta del reviewed
    response_text TEXT,
    response_at TIMESTAMPTZ,

    -- ¿Recomendaría?
    would_recommend BOOLEAN,

    -- Visibilidad
    is_public BOOLEAN DEFAULT true,

    -- Moderación
    is_flagged BOOLEAN DEFAULT false,
    flagged_reason TEXT,
    moderated_at TIMESTAMPTZ,
    moderated_by UUID REFERENCES public.profiles(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(proposal_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewed ON public.marketplace_reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.marketplace_reviews(overall_rating);

-- =====================================================
-- 7. FAVORITOS DE MARKETPLACE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.marketplace_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    creator_id UUID NOT NULL REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_user ON public.marketplace_favorites(user_id);

-- =====================================================
-- 8. VISTAS DE PERFIL (Analytics)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id),
    viewer_id UUID REFERENCES public.profiles(id),
    viewer_anon_id TEXT,
    source VARCHAR(50),
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_views ON public.profile_views(profile_id, viewed_at);

-- =====================================================
-- 9. NOTIFICACIONES MARKETPLACE (Extender)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.marketplace_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    actor_id UUID REFERENCES public.profiles(id),
    notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN (
        'new_proposal',
        'proposal_accepted',
        'proposal_declined',
        'proposal_expired',
        'new_message',
        'new_review',
        'availability_reminder',
        'contract_started',
        'contract_completed',
        'payment_received'
    )),
    entity_type VARCHAR(30),
    entity_id UUID,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_notifications_user ON public.marketplace_notifications(user_id, is_read);

-- =====================================================
-- 10. AGREGAR CAMPOS A PROFILES
-- =====================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_available_for_hire BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS marketplace_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS minimum_budget DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(20) DEFAULT 'kreoon',
ADD COLUMN IF NOT EXISTS total_contracts_completed INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(2,1),
ADD COLUMN IF NOT EXISTS response_rate DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS on_time_delivery_rate DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS is_featured_creator BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

-- =====================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Creator Services
ALTER TABLE public.creator_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_services_select_policy" ON public.creator_services
    FOR SELECT USING (is_active = true OR user_id = auth.uid());

CREATE POLICY "creator_services_insert_policy" ON public.creator_services
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "creator_services_update_policy" ON public.creator_services
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "creator_services_delete_policy" ON public.creator_services
    FOR DELETE USING (user_id = auth.uid());

-- Creator Availability
ALTER TABLE public.creator_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_availability_select_policy" ON public.creator_availability
    FOR SELECT USING (true);

CREATE POLICY "creator_availability_insert_policy" ON public.creator_availability
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "creator_availability_update_policy" ON public.creator_availability
    FOR UPDATE USING (user_id = auth.uid());

-- Marketplace Verifications
ALTER TABLE public.marketplace_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace_verifications_select_policy" ON public.marketplace_verifications
    FOR SELECT USING (true);

CREATE POLICY "marketplace_verifications_update_own" ON public.marketplace_verifications
    FOR UPDATE USING (user_id = auth.uid());

-- Marketplace Proposals
ALTER TABLE public.marketplace_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace_proposals_select_policy" ON public.marketplace_proposals
    FOR SELECT USING (client_id = auth.uid() OR provider_id = auth.uid());

CREATE POLICY "marketplace_proposals_insert_policy" ON public.marketplace_proposals
    FOR INSERT WITH CHECK (client_id = auth.uid());

CREATE POLICY "marketplace_proposals_update_policy" ON public.marketplace_proposals
    FOR UPDATE USING (client_id = auth.uid() OR provider_id = auth.uid());

-- Proposal Messages
ALTER TABLE public.marketplace_proposal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposal_messages_select_policy" ON public.marketplace_proposal_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.marketplace_proposals p
            WHERE p.id = proposal_id
            AND (p.client_id = auth.uid() OR p.provider_id = auth.uid())
        )
    );

CREATE POLICY "proposal_messages_insert_policy" ON public.marketplace_proposal_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.marketplace_proposals p
            WHERE p.id = proposal_id
            AND (p.client_id = auth.uid() OR p.provider_id = auth.uid())
        )
    );

-- Marketplace Reviews
ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace_reviews_select_policy" ON public.marketplace_reviews
    FOR SELECT USING (is_public = true OR reviewer_id = auth.uid() OR reviewed_id = auth.uid());

CREATE POLICY "marketplace_reviews_insert_policy" ON public.marketplace_reviews
    FOR INSERT WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "marketplace_reviews_update_policy" ON public.marketplace_reviews
    FOR UPDATE USING (reviewer_id = auth.uid() OR reviewed_id = auth.uid());

-- Marketplace Favorites
ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace_favorites_select_policy" ON public.marketplace_favorites
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "marketplace_favorites_insert_policy" ON public.marketplace_favorites
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "marketplace_favorites_delete_policy" ON public.marketplace_favorites
    FOR DELETE USING (user_id = auth.uid());

-- Profile Views
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_views_select_policy" ON public.profile_views
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "profile_views_insert_policy" ON public.profile_views
    FOR INSERT WITH CHECK (true);

-- Marketplace Notifications
ALTER TABLE public.marketplace_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace_notifications_select_policy" ON public.marketplace_notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "marketplace_notifications_update_policy" ON public.marketplace_notifications
    FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- 12. GRANTS
-- =====================================================

GRANT ALL ON public.creator_services TO authenticated;
GRANT ALL ON public.creator_availability TO authenticated;
GRANT ALL ON public.marketplace_verifications TO authenticated;
GRANT ALL ON public.marketplace_proposals TO authenticated;
GRANT ALL ON public.marketplace_proposal_messages TO authenticated;
GRANT ALL ON public.marketplace_reviews TO authenticated;
GRANT ALL ON public.marketplace_favorites TO authenticated;
GRANT ALL ON public.profile_views TO authenticated;
GRANT ALL ON public.marketplace_notifications TO authenticated;

GRANT SELECT ON public.creator_services TO anon;
GRANT SELECT ON public.creator_availability TO anon;
GRANT SELECT ON public.marketplace_verifications TO anon;
GRANT SELECT ON public.marketplace_reviews TO anon;
GRANT INSERT ON public.profile_views TO anon;

-- =====================================================
-- 13. FUNCIONES HELPER
-- =====================================================

-- Función para actualizar avg_rating del perfil cuando se agrega una review
CREATE OR REPLACE FUNCTION update_profile_avg_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET avg_rating = (
        SELECT ROUND(AVG(overall_rating)::numeric, 1)
        FROM public.marketplace_reviews
        WHERE reviewed_id = NEW.reviewed_id
        AND is_public = true
    )
    WHERE id = NEW.reviewed_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_profile_rating
    AFTER INSERT OR UPDATE ON public.marketplace_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_avg_rating();

-- Función para auto-actualizar disponibilidad
CREATE OR REPLACE FUNCTION update_creator_availability_auto()
RETURNS TRIGGER AS $$
BEGIN
    -- Si alcanza el threshold, poner en busy
    IF NEW.current_projects_count >= NEW.auto_busy_threshold
       AND NEW.status = 'available' THEN
        NEW.status := 'busy';
    END IF;

    -- Si baja del threshold y estaba busy, volver a available
    IF NEW.current_projects_count < NEW.auto_busy_threshold
       AND OLD.current_projects_count >= OLD.auto_busy_threshold
       AND NEW.status = 'busy' THEN
        NEW.status := 'available';
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_availability
    BEFORE UPDATE ON public.creator_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_creator_availability_auto();

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_marketplace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_creator_services_updated
    BEFORE UPDATE ON public.creator_services
    FOR EACH ROW
    EXECUTE FUNCTION update_marketplace_updated_at();

CREATE TRIGGER trigger_proposals_updated
    BEFORE UPDATE ON public.marketplace_proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_marketplace_updated_at();

CREATE TRIGGER trigger_verifications_updated
    BEFORE UPDATE ON public.marketplace_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_marketplace_updated_at();
