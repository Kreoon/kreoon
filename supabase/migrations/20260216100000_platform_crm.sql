-- =====================================================
-- CRM NIVEL PLATAFORMA - Gestión global de Kreoon
-- Migration: 20260216100000_create_platform_crm_tables
-- =====================================================

-- =====================================================
-- 1. TABLES
-- =====================================================

-- Leads de marketing (personas que aún no se registran)
CREATE TABLE platform_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Datos básicos
    full_name TEXT,
    email TEXT,
    phone TEXT,

    -- Clasificación
    lead_type TEXT CHECK (lead_type IN ('creator', 'brand', 'agency', 'other')),
    lead_source TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,

    -- Pipeline
    stage TEXT DEFAULT 'new' CHECK (stage IN (
        'new',
        'contacted',
        'interested',
        'demo_scheduled',
        'converted',
        'lost'
    )),

    -- Scoring
    lead_score INTEGER DEFAULT 0,

    -- Conversión
    converted_at TIMESTAMPTZ,
    converted_user_id UUID REFERENCES auth.users(id),

    -- Asignación
    assigned_to UUID REFERENCES auth.users(id),

    -- Metadata
    notes TEXT,
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interacciones con leads (touchpoints)
CREATE TABLE platform_lead_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES platform_leads(id) ON DELETE CASCADE,

    interaction_type TEXT CHECK (interaction_type IN (
        'email_sent', 'email_opened', 'email_clicked',
        'whatsapp_sent', 'whatsapp_reply',
        'call', 'meeting', 'demo',
        'form_submitted', 'page_visited',
        'note'
    )),

    subject TEXT,
    content TEXT,
    metadata JSONB DEFAULT '{}',

    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salud de usuarios activos (post-conversión)
CREATE TABLE platform_user_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Métricas de engagement
    last_login_at TIMESTAMPTZ,
    total_logins INTEGER DEFAULT 0,
    days_since_last_activity INTEGER,

    -- Métricas de uso (creadores)
    total_applications INTEGER DEFAULT 0,
    total_completed_projects INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2),

    -- Métricas de uso (marcas/orgs)
    total_campaigns_created INTEGER DEFAULT 0,
    total_content_received INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,

    -- Health score calculado
    health_score INTEGER DEFAULT 50,
    health_status TEXT CHECK (health_status IN ('healthy', 'at_risk', 'churning', 'churned')),

    -- Flags
    needs_attention BOOLEAN DEFAULT FALSE,
    last_contact_at TIMESTAMPTZ,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

-- platform_leads
CREATE INDEX idx_platform_leads_email ON platform_leads(email);
CREATE INDEX idx_platform_leads_lead_type ON platform_leads(lead_type);
CREATE INDEX idx_platform_leads_stage ON platform_leads(stage);
CREATE INDEX idx_platform_leads_lead_source ON platform_leads(lead_source);
CREATE INDEX idx_platform_leads_created ON platform_leads(created_at DESC);

-- platform_lead_interactions
CREATE INDEX idx_lead_interactions_lead ON platform_lead_interactions(lead_id);
CREATE INDEX idx_lead_interactions_type ON platform_lead_interactions(interaction_type);
CREATE INDEX idx_lead_interactions_created ON platform_lead_interactions(created_at DESC);

-- platform_user_health
CREATE UNIQUE INDEX idx_user_health_user ON platform_user_health(user_id);
CREATE INDEX idx_user_health_status ON platform_user_health(health_status);
CREATE INDEX idx_user_health_score ON platform_user_health(health_score);

-- =====================================================
-- 3. UPDATED_AT TRIGGERS
-- =====================================================

CREATE TRIGGER trg_platform_leads_updated
    BEFORE UPDATE ON platform_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_platform_user_health_updated
    BEFORE UPDATE ON platform_user_health
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
