-- ============================================================
-- UNIFIED PROJECT TYPES
-- Adds project_type to marketplace_projects and creates
-- org-level type configuration table.
-- ============================================================

-- 1. Create enum for project types
DO $$ BEGIN
  CREATE TYPE project_type AS ENUM (
    'content_creation',
    'post_production',
    'strategy_marketing',
    'technology',
    'education'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add project_type column to marketplace_projects
ALTER TABLE marketplace_projects
  ADD COLUMN IF NOT EXISTS project_type project_type NOT NULL DEFAULT 'content_creation';

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_marketplace_projects_type
  ON marketplace_projects(project_type);

-- Composite index for org + type queries
CREATE INDEX IF NOT EXISTS idx_marketplace_projects_org_type
  ON marketplace_projects(organization_id, project_type);

-- 3. Organization-level type configuration overrides
CREATE TABLE IF NOT EXISTS project_type_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_type project_type NOT NULL,
  visible_sections text[] NOT NULL DEFAULT '{}',
  workspace_type text NOT NULL DEFAULT 'script',
  custom_brief_fields jsonb DEFAULT '[]'::jsonb,
  allowed_roles text[] DEFAULT '{}',
  enabled_features jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, project_type)
);

-- RLS for project_type_configs
ALTER TABLE project_type_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ptc_select_members"
  ON project_type_configs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ptc_all_admins"
  ON project_type_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid()
        AND organization_id = project_type_configs.organization_id
        AND role = 'admin'
    )
  );

-- Grant access to authenticated role
GRANT SELECT ON project_type_configs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON project_type_configs TO authenticated;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_project_type_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_type_configs_updated_at ON project_type_configs;
CREATE TRIGGER trg_project_type_configs_updated_at
  BEFORE UPDATE ON project_type_configs
  FOR EACH ROW EXECUTE FUNCTION update_project_type_configs_updated_at();
