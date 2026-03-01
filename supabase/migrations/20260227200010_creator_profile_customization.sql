-- Add customization columns to creator_profiles
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS accent_color text DEFAULT 'purple',
ADD COLUMN IF NOT EXISTS portfolio_layout text DEFAULT 'grid',
ADD COLUMN IF NOT EXISTS section_order text[] DEFAULT ARRAY['portfolio', 'services', 'reviews', 'stats'],
ADD COLUMN IF NOT EXISTS featured_links jsonb DEFAULT '[]'::jsonb;

-- Add check constraints (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_accent_color'
  ) THEN
    ALTER TABLE creator_profiles
    ADD CONSTRAINT valid_accent_color CHECK (
      accent_color IN ('purple', 'blue', 'green', 'orange', 'pink', 'white', 'black', 'yellow')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_portfolio_layout'
  ) THEN
    ALTER TABLE creator_profiles
    ADD CONSTRAINT valid_portfolio_layout CHECK (
      portfolio_layout IN ('grid', 'masonry', 'featured')
    );
  END IF;
END $$;

-- Index for featured_links queries
CREATE INDEX IF NOT EXISTS idx_creator_profiles_accent_color
ON creator_profiles(accent_color);

COMMENT ON COLUMN creator_profiles.accent_color IS 'User-selected accent color from Kreoon palette';
COMMENT ON COLUMN creator_profiles.portfolio_layout IS 'Portfolio display layout: grid, masonry, or featured';
COMMENT ON COLUMN creator_profiles.section_order IS 'Order of profile sections';
COMMENT ON COLUMN creator_profiles.featured_links IS 'Array of {label, url} objects for highlighted links';
