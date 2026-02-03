-- Create waitlist table for feature waitlists (e.g., Live Shopping)
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  feature TEXT NOT NULL DEFAULT 'live_shopping',
  source TEXT DEFAULT 'landing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notified_at TIMESTAMP WITH TIME ZONE,
  
  -- Prevent duplicate emails per feature
  UNIQUE(email, feature)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_feature ON waitlist(feature);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at DESC);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Policies (DROP IF EXISTS for idempotency on re-runs)
DROP POLICY IF EXISTS "Anyone can join waitlist" ON waitlist;
DROP POLICY IF EXISTS "Admins can read waitlist" ON waitlist;
DROP POLICY IF EXISTS "Admins can update waitlist" ON waitlist;

-- Policy: Anyone can insert (public waitlist signup)
CREATE POLICY "Anyone can join waitlist"
  ON waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only platform admins can read waitlist
CREATE POLICY "Admins can read waitlist"
  ON waitlist
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Policy: Only platform admins can update waitlist (e.g., mark as notified)
CREATE POLICY "Admins can update waitlist"
  ON waitlist
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Comment on table
COMMENT ON TABLE waitlist IS 'Stores email signups for upcoming features like Live Shopping';
COMMENT ON COLUMN waitlist.feature IS 'The feature being waited for (e.g., live_shopping)';
COMMENT ON COLUMN waitlist.source IS 'Where the signup came from (landing, features, pricing, etc.)';
COMMENT ON COLUMN waitlist.notified_at IS 'When the user was notified that the feature is available';
