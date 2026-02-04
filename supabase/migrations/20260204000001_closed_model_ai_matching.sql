-- =====================================================
-- FASE 4.5C: MODELO CERRADO + IA MATCHING
-- =====================================================
-- Kreoon como Airbnb de creadores:
-- - Sin contactos externos (toda comunicación interna)
-- - IA para matching empresa-creador
-- - Perfiles de empresa con nicho/industria
-- =====================================================

-- =====================================================
-- 1. PERFILES DE EMPRESA/MARCA (Clientes)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Información básica
    company_name VARCHAR(255) NOT NULL,
    company_logo_url TEXT,
    company_website TEXT,  -- Solo para verificación, no se muestra públicamente

    -- Industria y nicho (crítico para matching)
    industry VARCHAR(100) NOT NULL,  -- 'beauty', 'tech', 'food', 'fashion', 'fitness', etc.
    sub_industry VARCHAR(100),
    niche_tags TEXT[] DEFAULT '{}',  -- ['skincare', 'anti-aging', 'organic']

    -- Descripción para IA
    company_description TEXT,
    target_audience TEXT,  -- "Mujeres 25-45, interesadas en skincare natural"
    brand_voice TEXT,  -- "Profesional pero cercano, educativo"
    content_goals TEXT,  -- "Aumentar awareness, generar conversiones"

    -- Preferencias de contenido
    preferred_content_types TEXT[] DEFAULT '{}',  -- ['ugc_video', 'ugc_photo']
    preferred_platforms TEXT[] DEFAULT '{}',  -- ['tiktok', 'instagram', 'youtube']
    typical_budget_range VARCHAR(20),  -- 'low' (<$200), 'medium' ($200-$1000), 'high' (>$1000)

    -- Historial para mejorar matching
    successful_creator_ids UUID[] DEFAULT '{}',  -- Creadores con buenos resultados
    preferred_creator_styles TEXT[] DEFAULT '{}',  -- ['minimalist', 'energetic', 'educational']

    -- Embedding para búsqueda semántica (generado por IA)
    profile_embedding vector(1536),  -- Para similarity search

    -- Verificación
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_profiles_industry ON public.company_profiles(industry);
CREATE INDEX IF NOT EXISTS idx_company_profiles_user ON public.company_profiles(user_id);

-- =====================================================
-- 2. PERFILES DE CREADOR EXTENDIDOS (Para IA)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.creator_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Categorías y especialización
    primary_category VARCHAR(100),  -- 'beauty', 'tech', 'lifestyle', etc.
    secondary_categories TEXT[] DEFAULT '{}',
    specialization_tags TEXT[] DEFAULT '{}',  -- ['skincare', 'tutorials', 'reviews']

    -- Estilo y voz
    content_style TEXT[] DEFAULT '{}',  -- ['minimalist', 'energetic', 'educational', 'funny']
    brand_voice_description TEXT,  -- "Cercano y auténtico, con toques de humor"

    -- Demografía de audiencia (auto-reportada o inferida)
    audience_age_range VARCHAR(20),  -- '18-24', '25-34', '35-44'
    audience_gender VARCHAR(20),  -- 'mostly_female', 'mostly_male', 'balanced'
    audience_locations TEXT[] DEFAULT '{}',  -- ['colombia', 'mexico', 'spain']
    audience_interests TEXT[] DEFAULT '{}',

    -- Métricas de rendimiento (para ranking)
    avg_engagement_rate DECIMAL(5,2),
    content_quality_score DECIMAL(3,2),  -- 0-5, calculado por IA
    consistency_score DECIMAL(3,2),  -- Frecuencia de entrega a tiempo
    communication_score DECIMAL(3,2),

    -- Plataformas donde es fuerte
    strong_platforms TEXT[] DEFAULT '{}',  -- ['tiktok', 'instagram']

    -- Experiencia con industrias
    industry_experience JSONB DEFAULT '{}',
    -- Ejemplo: {"beauty": {"projects": 15, "avg_rating": 4.8}, "tech": {"projects": 3, "avg_rating": 4.5}}

    -- Embedding para búsqueda semántica (generado por IA)
    profile_embedding vector(1536),
    portfolio_embedding vector(1536),  -- Basado en su contenido

    -- Última actualización de embeddings
    embeddings_updated_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_category ON public.creator_profiles(primary_category);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user ON public.creator_profiles(user_id);

-- =====================================================
-- 3. INDUSTRIAS Y CATEGORÍAS (Catálogo)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.marketplace_industries (
    id VARCHAR(50) PRIMARY KEY,
    name_es VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    icon VARCHAR(10),
    parent_id VARCHAR(50) REFERENCES public.marketplace_industries(id),
    description TEXT,
    keywords TEXT[] DEFAULT '{}',  -- Para matching
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Insertar industrias principales
INSERT INTO public.marketplace_industries (id, name_es, name_en, icon, keywords, display_order) VALUES
('beauty', 'Belleza y Cuidado Personal', 'Beauty & Personal Care', '💄', ARRAY['skincare', 'makeup', 'haircare', 'cosmetics', 'wellness'], 1),
('fashion', 'Moda y Accesorios', 'Fashion & Accessories', '👗', ARRAY['clothing', 'shoes', 'jewelry', 'accessories', 'style'], 2),
('tech', 'Tecnología', 'Technology', '📱', ARRAY['apps', 'software', 'gadgets', 'electronics', 'saas'], 3),
('food', 'Alimentos y Bebidas', 'Food & Beverage', '🍔', ARRAY['restaurants', 'snacks', 'drinks', 'healthy', 'recipes'], 4),
('fitness', 'Fitness y Deportes', 'Fitness & Sports', '💪', ARRAY['gym', 'workout', 'nutrition', 'sports', 'activewear'], 5),
('home', 'Hogar y Decoración', 'Home & Decor', '🏠', ARRAY['furniture', 'decor', 'organization', 'diy', 'garden'], 6),
('travel', 'Viajes y Turismo', 'Travel & Tourism', '✈️', ARRAY['hotels', 'destinations', 'experiences', 'adventure'], 7),
('finance', 'Finanzas y Fintech', 'Finance & Fintech', '💰', ARRAY['banking', 'investment', 'crypto', 'insurance', 'savings'], 8),
('education', 'Educación', 'Education', '📚', ARRAY['courses', 'learning', 'skills', 'language', 'certification'], 9),
('entertainment', 'Entretenimiento', 'Entertainment', '🎬', ARRAY['gaming', 'streaming', 'music', 'movies', 'events'], 10),
('health', 'Salud y Bienestar', 'Health & Wellness', '🏥', ARRAY['medical', 'mental health', 'supplements', 'therapy'], 11),
('pets', 'Mascotas', 'Pets', '🐾', ARRAY['dogs', 'cats', 'pet food', 'accessories', 'veterinary'], 12),
('baby', 'Bebés y Maternidad', 'Baby & Maternity', '👶', ARRAY['baby products', 'parenting', 'pregnancy', 'toys'], 13),
('automotive', 'Automotriz', 'Automotive', '🚗', ARRAY['cars', 'motorcycles', 'accessories', 'maintenance'], 14),
('services', 'Servicios Profesionales', 'Professional Services', '💼', ARRAY['consulting', 'legal', 'marketing', 'hr'], 15)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. HISTORIAL DE MATCHES (Para mejorar IA)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ai_match_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Quién buscó
    searcher_id UUID NOT NULL REFERENCES public.profiles(id),
    searcher_type VARCHAR(20) NOT NULL,  -- 'company' o 'creator'

    -- Creador mostrado/recomendado
    creator_id UUID NOT NULL REFERENCES public.profiles(id),

    -- Contexto del match
    search_context JSONB,  -- {industry, budget, content_type, etc.}
    match_score DECIMAL(5,4),  -- 0.0000 - 1.0000
    match_reason TEXT,  -- Explicación de por qué se recomendó

    -- Resultado del match (feedback para mejorar)
    was_clicked BOOLEAN DEFAULT false,
    was_contacted BOOLEAN DEFAULT false,
    was_hired BOOLEAN DEFAULT false,
    final_rating INT,  -- Si hubo contrato, rating final

    -- Posición en resultados
    position_shown INT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_history_searcher ON public.ai_match_history(searcher_id, created_at);
CREATE INDEX IF NOT EXISTS idx_match_history_creator ON public.ai_match_history(creator_id);
CREATE INDEX IF NOT EXISTS idx_match_history_feedback ON public.ai_match_history(was_hired, final_rating);

-- =====================================================
-- 5. BÚSQUEDAS GUARDADAS (Para notificar nuevos matches)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Criterios de búsqueda
    search_name VARCHAR(100),
    industry VARCHAR(100),
    content_types TEXT[] DEFAULT '{}',
    budget_range VARCHAR(20),
    min_rating DECIMAL(2,1),
    tags TEXT[] DEFAULT '{}',

    -- Notificaciones
    notify_new_matches BOOLEAN DEFAULT true,
    notify_frequency VARCHAR(20) DEFAULT 'daily',  -- 'instant', 'daily', 'weekly'
    last_notified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. SISTEMA DE COMUNICACIÓN INTERNA (Chat)
-- =====================================================

-- Conversaciones del marketplace (separado del chat general)
CREATE TABLE IF NOT EXISTS public.marketplace_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Participantes
    company_user_id UUID NOT NULL REFERENCES public.profiles(id),
    creator_user_id UUID NOT NULL REFERENCES public.profiles(id),

    -- Propuesta asociada (si existe)
    proposal_id UUID REFERENCES public.marketplace_proposals(id),

    -- Estado
    status VARCHAR(20) DEFAULT 'active',  -- 'active', 'archived', 'blocked'

    -- Último mensaje (para ordenar)
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT,

    -- Contadores de no leídos
    company_unread_count INT DEFAULT 0,
    creator_unread_count INT DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_user_id, creator_user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_company ON public.marketplace_conversations(company_user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_creator ON public.marketplace_conversations(creator_user_id, last_message_at DESC);

-- Mensajes de conversación
CREATE TABLE IF NOT EXISTS public.marketplace_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.marketplace_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id),

    -- Contenido
    message_type VARCHAR(20) DEFAULT 'text',  -- 'text', 'file', 'proposal', 'system'
    content TEXT NOT NULL,

    -- Adjuntos (archivos internos, no links externos)
    attachments JSONB DEFAULT '[]',

    -- Si es una propuesta embebida
    embedded_proposal_id UUID REFERENCES public.marketplace_proposals(id),

    -- Estado
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,

    -- Moderación automática (detectar contactos externos)
    flagged_external_contact BOOLEAN DEFAULT false,
    moderation_status VARCHAR(20) DEFAULT 'approved',  -- 'approved', 'flagged', 'blocked'

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.marketplace_messages(conversation_id, created_at);

-- =====================================================
-- 7. DETECCIÓN DE CONTACTO EXTERNO (Anti-bypass)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.contact_violation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),

    -- Tipo de violación
    violation_type VARCHAR(50) NOT NULL,  -- 'phone_in_message', 'email_in_message', 'social_link', etc.
    detected_content TEXT,  -- El contenido detectado (parcialmente ofuscado)
    context_type VARCHAR(50),  -- 'message', 'proposal', 'profile_bio'
    context_id UUID,

    -- Acción tomada
    action_taken VARCHAR(50),  -- 'warned', 'message_blocked', 'account_flagged'

    -- Contador de violaciones
    violation_count INT DEFAULT 1,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_violations_user ON public.contact_violation_logs(user_id, created_at);

-- =====================================================
-- 8. CONFIGURACIÓN DE PRIVACIDAD (Ocultar contactos)
-- =====================================================

-- Actualizar profiles para ocultar contactos
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS contact_visibility VARCHAR(20) DEFAULT 'hidden',  -- 'hidden', 'after_contract', 'verified_only'
ADD COLUMN IF NOT EXISTS external_links_hidden BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_email_after_contract BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_phone_after_contract BOOLEAN DEFAULT false;

-- =====================================================
-- 9. RLS POLICIES
-- =====================================================

-- Company profiles
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_profiles_select" ON public.company_profiles
    FOR SELECT USING (true);  -- Públicos para búsqueda

CREATE POLICY "company_profiles_insert" ON public.company_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "company_profiles_update" ON public.company_profiles
    FOR UPDATE USING (user_id = auth.uid());

-- Creator profiles
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_profiles_select" ON public.creator_profiles
    FOR SELECT USING (true);

CREATE POLICY "creator_profiles_insert" ON public.creator_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "creator_profiles_update" ON public.creator_profiles
    FOR UPDATE USING (user_id = auth.uid());

-- AI Match history
ALTER TABLE public.ai_match_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_history_select" ON public.ai_match_history
    FOR SELECT USING (searcher_id = auth.uid() OR creator_id = auth.uid());

CREATE POLICY "match_history_insert" ON public.ai_match_history
    FOR INSERT WITH CHECK (true);  -- Service role only en producción

-- Conversations
ALTER TABLE public.marketplace_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select" ON public.marketplace_conversations
    FOR SELECT USING (company_user_id = auth.uid() OR creator_user_id = auth.uid());

CREATE POLICY "conversations_insert" ON public.marketplace_conversations
    FOR INSERT WITH CHECK (company_user_id = auth.uid() OR creator_user_id = auth.uid());

CREATE POLICY "conversations_update" ON public.marketplace_conversations
    FOR UPDATE USING (company_user_id = auth.uid() OR creator_user_id = auth.uid());

-- Messages
ALTER TABLE public.marketplace_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select" ON public.marketplace_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.marketplace_conversations c
            WHERE c.id = conversation_id
            AND (c.company_user_id = auth.uid() OR c.creator_user_id = auth.uid())
        )
    );

CREATE POLICY "messages_insert" ON public.marketplace_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.marketplace_conversations c
            WHERE c.id = conversation_id
            AND (c.company_user_id = auth.uid() OR c.creator_user_id = auth.uid())
        )
    );

-- Saved searches
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_searches_all" ON public.saved_searches
    FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 10. GRANTS
-- =====================================================

GRANT ALL ON public.company_profiles TO authenticated;
GRANT ALL ON public.creator_profiles TO authenticated;
GRANT SELECT ON public.marketplace_industries TO authenticated, anon;
GRANT ALL ON public.ai_match_history TO authenticated;
GRANT ALL ON public.saved_searches TO authenticated;
GRANT ALL ON public.marketplace_conversations TO authenticated;
GRANT ALL ON public.marketplace_messages TO authenticated;
GRANT SELECT ON public.contact_violation_logs TO authenticated;

-- =====================================================
-- 11. FUNCIONES PARA DETECCIÓN DE CONTACTO EXTERNO
-- =====================================================

CREATE OR REPLACE FUNCTION detect_external_contact(content TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{"has_violation": false, "violations": []}'::jsonb;
    violations TEXT[] := '{}';
BEGIN
    -- Detectar teléfonos (varios formatos)
    IF content ~* '\+?\d{1,3}[-.\s]?\(?\d{2,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}' THEN
        violations := array_append(violations, 'phone_number');
    END IF;

    -- Detectar emails
    IF content ~* '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' THEN
        violations := array_append(violations, 'email');
    END IF;

    -- Detectar redes sociales
    IF content ~* '(instagram|ig|insta|@)[:\s]*[a-zA-Z0-9._]+' THEN
        violations := array_append(violations, 'instagram');
    END IF;

    IF content ~* '(whatsapp|whats|wsp|wa\.me)[:\s/]*[\d+]+' THEN
        violations := array_append(violations, 'whatsapp');
    END IF;

    IF content ~* '(telegram|tg|t\.me)[:\s/]*[a-zA-Z0-9_]+' THEN
        violations := array_append(violations, 'telegram');
    END IF;

    IF content ~* '(tiktok|tt)[:\s/]*@?[a-zA-Z0-9._]+' THEN
        violations := array_append(violations, 'tiktok');
    END IF;

    IF content ~* '(twitter|x\.com)[:\s/]*@?[a-zA-Z0-9_]+' THEN
        violations := array_append(violations, 'twitter');
    END IF;

    IF content ~* '(linkedin|li)[:\s/]*[a-zA-Z0-9-]+' THEN
        violations := array_append(violations, 'linkedin');
    END IF;

    -- Detectar URLs genéricas (excepto dominios permitidos)
    IF content ~* 'https?://(?!.*kreoon\.)' THEN
        violations := array_append(violations, 'external_url');
    END IF;

    IF array_length(violations, 1) > 0 THEN
        result := jsonb_build_object(
            'has_violation', true,
            'violations', to_jsonb(violations)
        );
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para verificar mensajes antes de insertar
CREATE OR REPLACE FUNCTION check_message_for_violations()
RETURNS TRIGGER AS $$
DECLARE
    detection JSONB;
BEGIN
    detection := detect_external_contact(NEW.content);

    IF (detection->>'has_violation')::boolean THEN
        -- Marcar el mensaje
        NEW.flagged_external_contact := true;
        NEW.moderation_status := 'flagged';

        -- Registrar la violación
        INSERT INTO public.contact_violation_logs (
            user_id,
            violation_type,
            detected_content,
            context_type,
            context_id,
            action_taken
        ) VALUES (
            NEW.sender_id,
            (detection->'violations'->>0),
            LEFT(NEW.content, 100),
            'message',
            NEW.id,
            'message_flagged'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_message_violations
    BEFORE INSERT ON public.marketplace_messages
    FOR EACH ROW
    EXECUTE FUNCTION check_message_for_violations();

-- =====================================================
-- 12. FUNCIÓN PARA ACTUALIZAR CONVERSACIÓN
-- =====================================================

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
    conv RECORD;
BEGIN
    -- Obtener la conversación
    SELECT * INTO conv FROM public.marketplace_conversations WHERE id = NEW.conversation_id;

    -- Actualizar último mensaje
    UPDATE public.marketplace_conversations
    SET
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100),
        company_unread_count = CASE
            WHEN NEW.sender_id = conv.creator_user_id THEN company_unread_count + 1
            ELSE company_unread_count
        END,
        creator_unread_count = CASE
            WHEN NEW.sender_id = conv.company_user_id THEN creator_unread_count + 1
            ELSE creator_unread_count
        END
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation
    AFTER INSERT ON public.marketplace_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_message();
