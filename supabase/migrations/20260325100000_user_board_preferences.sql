-- Migration: User Board Preferences
-- Stores per-user board customization settings with hybrid localStorage + Supabase sync

-- Create table for user board preferences
CREATE TABLE IF NOT EXISTS user_board_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- General preferences
  preferences JSONB NOT NULL DEFAULT '{
    "preferredView": "kanban",
    "cardSize": "normal",
    "compactMode": false,
    "defaultSort": {"field": "created_at", "direction": "desc"}
  }'::jsonb,

  -- Saved views (custom + presets)
  saved_views JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Active view ID (null = default)
  active_view_id TEXT,

  -- Table column configuration
  table_config JSONB NOT NULL DEFAULT '{
    "visibleColumns": ["title", "status", "client", "responsible", "deadline"],
    "columnOrder": ["title", "status", "client", "responsible", "deadline"],
    "columnWidths": {}
  }'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint per user per org
  UNIQUE(user_id, organization_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_board_prefs_user ON user_board_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_board_prefs_org ON user_board_preferences(organization_id);

-- Enable RLS
ALTER TABLE user_board_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own preferences
CREATE POLICY "Users can read own board preferences"
  ON user_board_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own board preferences"
  ON user_board_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own board preferences"
  ON user_board_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own board preferences"
  ON user_board_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_board_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_board_preferences_updated_at ON user_board_preferences;
CREATE TRIGGER trigger_board_preferences_updated_at
  BEFORE UPDATE ON user_board_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_board_preferences_updated_at();

-- RPC function to upsert preferences (for sync)
CREATE OR REPLACE FUNCTION upsert_board_preferences(
  p_organization_id UUID,
  p_preferences JSONB DEFAULT NULL,
  p_saved_views JSONB DEFAULT NULL,
  p_active_view_id TEXT DEFAULT NULL,
  p_table_config JSONB DEFAULT NULL
)
RETURNS user_board_preferences
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result user_board_preferences;
BEGIN
  INSERT INTO user_board_preferences (
    user_id,
    organization_id,
    preferences,
    saved_views,
    active_view_id,
    table_config
  )
  VALUES (
    auth.uid(),
    p_organization_id,
    COALESCE(p_preferences, '{"preferredView": "kanban", "cardSize": "normal"}'::jsonb),
    COALESCE(p_saved_views, '[]'::jsonb),
    p_active_view_id,
    COALESCE(p_table_config, '{"visibleColumns": [], "columnOrder": [], "columnWidths": {}}'::jsonb)
  )
  ON CONFLICT (user_id, organization_id)
  DO UPDATE SET
    preferences = COALESCE(p_preferences, user_board_preferences.preferences),
    saved_views = COALESCE(p_saved_views, user_board_preferences.saved_views),
    active_view_id = COALESCE(p_active_view_id, user_board_preferences.active_view_id),
    table_config = COALESCE(p_table_config, user_board_preferences.table_config),
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- RPC function to get preferences with defaults
CREATE OR REPLACE FUNCTION get_board_preferences(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefs user_board_preferences;
BEGIN
  SELECT * INTO v_prefs
  FROM user_board_preferences
  WHERE user_id = auth.uid()
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'preferences', '{"preferredView": "kanban", "cardSize": "normal", "compactMode": false}'::jsonb,
      'saved_views', '[]'::jsonb,
      'active_view_id', null,
      'table_config', '{"visibleColumns": ["title", "status", "client", "responsible", "deadline"], "columnOrder": [], "columnWidths": {}}'::jsonb,
      'updated_at', null
    );
  END IF;

  RETURN jsonb_build_object(
    'preferences', v_prefs.preferences,
    'saved_views', v_prefs.saved_views,
    'active_view_id', v_prefs.active_view_id,
    'table_config', v_prefs.table_config,
    'updated_at', v_prefs.updated_at
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION upsert_board_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION get_board_preferences TO authenticated;

COMMENT ON TABLE user_board_preferences IS 'Per-user board customization settings with hybrid sync support';
