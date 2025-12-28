-- Add missing portfolio profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tagline text DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT '',
  ADD COLUMN IF NOT EXISTS best_at text DEFAULT '',
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS specialties_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS content_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS industries text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS style_keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience_level text DEFAULT 'junior',
  ADD COLUMN IF NOT EXISTS rate_per_content numeric,
  ADD COLUMN IF NOT EXISTS rate_currency text DEFAULT 'COP',
  ADD COLUMN IF NOT EXISTS social_linkedin text DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_youtube text DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_twitter text DEFAULT '';