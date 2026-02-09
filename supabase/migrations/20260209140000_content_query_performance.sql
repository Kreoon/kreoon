-- Compound index for the most common content query pattern:
-- SELECT * FROM content WHERE organization_id = ? ORDER BY created_at DESC LIMIT N
-- This replaces a sequential scan + sort with a single index scan.
CREATE INDEX IF NOT EXISTS idx_content_org_created
  ON content (organization_id, created_at DESC);

-- Also add compound index for creator-filtered queries
CREATE INDEX IF NOT EXISTS idx_content_creator_created
  ON content (creator_id, created_at DESC)
  WHERE creator_id IS NOT NULL;

-- And for editor-filtered queries
CREATE INDEX IF NOT EXISTS idx_content_editor_created
  ON content (editor_id, created_at DESC)
  WHERE editor_id IS NOT NULL;
