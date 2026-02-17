-- =====================================================
-- CRM NIVEL ORGANIZACIÓN - Cada org gestiona sus relaciones
-- Migration: 20260216100001_create_org_crm_tables
-- =====================================================

-- =====================================================
-- 1. TABLES
-- =====================================================

-- Contactos externos de cada organización
CREATE TABLE org_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Datos del contacto
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    position TEXT,
    avatar_url TEXT,

    -- Clasificación
    contact_type TEXT CHECK (contact_type IN (
        'lead',
        'client',
        'partner',
        'vendor',
        'influencer',
        'other'
    )),

    -- Pipeline (si es lead)
    pipeline_stage TEXT,
    deal_value DECIMAL(12,2),
    expected_close_date DATE,

    -- Relación
    relationship_strength TEXT CHECK (relationship_strength IN ('cold', 'warm', 'hot')),

    -- Metadata
    notes TEXT,
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    social_links JSONB DEFAULT '{}',

    -- Ownership
    created_by UUID REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relaciones de la org con creadores de la plataforma
CREATE TABLE org_creator_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Tipo de relación
    relationship_type TEXT CHECK (relationship_type IN (
        'favorite',
        'blocked',
        'team_member',
        'contacted',
        'worked_with'
    )),

    -- Datos de colaboración
    times_worked_together INTEGER DEFAULT 0,
    total_paid DECIMAL(12,2) DEFAULT 0,
    average_rating_given DECIMAL(3,2),
    last_collaboration_at TIMESTAMPTZ,

    -- Notas internas (solo la org las ve)
    internal_notes TEXT,
    internal_tags TEXT[],

    -- Lista/equipo
    list_name TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, creator_id, relationship_type)
);

-- Historial de interacciones con contactos
CREATE TABLE org_contact_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES org_contacts(id) ON DELETE CASCADE,

    interaction_type TEXT CHECK (interaction_type IN (
        'email', 'call', 'meeting', 'whatsapp',
        'proposal_sent', 'contract_signed', 'note'
    )),

    subject TEXT,
    content TEXT,
    outcome TEXT CHECK (outcome IN ('positive', 'neutral', 'negative')),
    next_action TEXT,
    next_action_date DATE,

    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipelines personalizables por organización
CREATE TABLE org_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    pipeline_type TEXT CHECK (pipeline_type IN ('sales', 'creators', 'partnerships', 'custom')),

    stages JSONB NOT NULL,

    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

-- org_contacts
CREATE INDEX idx_org_contacts_org ON org_contacts(organization_id);
CREATE INDEX idx_org_contacts_type ON org_contacts(organization_id, contact_type);
CREATE INDEX idx_org_contacts_stage ON org_contacts(organization_id, pipeline_stage);
CREATE INDEX idx_org_contacts_email ON org_contacts(organization_id, email);

-- org_creator_relationships
CREATE INDEX idx_org_creator_rel_org ON org_creator_relationships(organization_id);
CREATE INDEX idx_org_creator_rel_creator ON org_creator_relationships(creator_id);
CREATE INDEX idx_org_creator_rel_type ON org_creator_relationships(organization_id, relationship_type);
CREATE INDEX idx_org_creator_rel_list ON org_creator_relationships(organization_id, list_name);

-- org_contact_interactions
CREATE INDEX idx_org_contact_inter_contact ON org_contact_interactions(contact_id);
CREATE INDEX idx_org_contact_inter_org ON org_contact_interactions(organization_id);
CREATE INDEX idx_org_contact_inter_created ON org_contact_interactions(created_at DESC);

-- org_pipelines
CREATE INDEX idx_org_pipelines_org ON org_pipelines(organization_id);

-- =====================================================
-- 3. UPDATED_AT TRIGGERS
-- =====================================================

CREATE TRIGGER trg_org_contacts_updated
    BEFORE UPDATE ON org_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_org_creator_rel_updated
    BEFORE UPDATE ON org_creator_relationships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
