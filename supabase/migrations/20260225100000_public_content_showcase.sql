-- Migration: Public content showcase
-- Adds a SECURITY DEFINER function to fetch approved content for public display.
-- "Approved" = content that has passed through approval (approved_at IS NOT NULL).
-- Returns max 50 random videos for a given organization slug.

CREATE OR REPLACE FUNCTION public.get_public_org_content(org_slug text, max_items int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  video_url text,
  bunny_embed_url text,
  thumbnail_url text,
  status text,
  views_count int,
  likes_count int,
  approved_at timestamptz,
  created_at timestamptz,
  sphere_phase text,
  creator_name text,
  creator_avatar text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    c.id,
    c.title,
    c.description,
    c.video_url,
    c.bunny_embed_url,
    c.thumbnail_url,
    c.status::text,
    COALESCE(c.views_count, 0)::int,
    COALESCE(c.likes_count, 0)::int,
    c.approved_at,
    c.created_at,
    c.sphere_phase::text,
    p.full_name AS creator_name,
    p.avatar_url AS creator_avatar
  FROM public.content c
  JOIN public.organizations o ON o.id = c.organization_id
  LEFT JOIN public.profiles p ON p.id = c.creator_id
  WHERE o.slug = org_slug
    AND o.is_blocked IS NOT TRUE
    AND o.portfolio_enabled = true
    AND c.approved_at IS NOT NULL
    AND (c.video_url IS NOT NULL OR c.bunny_embed_url IS NOT NULL)
  ORDER BY random()
  LIMIT LEAST(max_items, 50);
$$;

-- Grant access to both anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_public_org_content(text, int) TO anon, authenticated;

-- Performance index for the query
CREATE INDEX IF NOT EXISTS idx_content_org_approved_video
  ON public.content(organization_id)
  WHERE approved_at IS NOT NULL
    AND (video_url IS NOT NULL OR bunny_embed_url IS NOT NULL);
