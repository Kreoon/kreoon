-- Migration: Public content showcase landing page
-- Adds SECURITY DEFINER functions to fetch org branding + approved content for public display.
-- "Approved" = content that has passed through approval (approved_at IS NOT NULL).
-- Returns max 50 random videos for a given organization slug.

-- 1. Simple table-returning function (kept for backward compat)
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
    c.id, c.title, c.description, c.video_url, c.bunny_embed_url, c.thumbnail_url,
    c.status::text, COALESCE(c.views_count, 0)::int, COALESCE(c.likes_count, 0)::int,
    c.approved_at, c.created_at, c.sphere_phase::text,
    p.full_name AS creator_name, p.avatar_url AS creator_avatar
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

GRANT EXECUTE ON FUNCTION public.get_public_org_content(text, int) TO anon, authenticated;

-- 2. Full page RPC: returns org branding + stats + content in a single call
CREATE OR REPLACE FUNCTION public.get_public_org_content_page(org_slug text, max_items int DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_org jsonb;
  v_content jsonb;
  v_org_id uuid;
  v_stats jsonb;
BEGIN
  -- Fetch org info with full branding
  SELECT jsonb_build_object(
    'id', o.id, 'name', o.name, 'slug', o.slug,
    'logo_url', o.logo_url, 'description', o.description,
    'portfolio_title', o.portfolio_title, 'portfolio_description', o.portfolio_description,
    'portfolio_cover', o.portfolio_cover, 'portfolio_color', o.portfolio_color,
    'primary_color', o.primary_color,
    'org_display_name', o.org_display_name, 'org_tagline', o.org_tagline,
    'org_cover_url', o.org_cover_url, 'org_specialties', o.org_specialties,
    'org_type', o.org_type,
    'org_website', o.org_website, 'org_instagram', o.org_instagram,
    'org_tiktok', o.org_tiktok, 'org_linkedin', o.org_linkedin,
    'instagram', o.instagram, 'tiktok', o.tiktok,
    'facebook', o.facebook, 'linkedin', o.linkedin, 'website', o.website,
    'city', o.city, 'country', o.country,
    'org_year_founded', o.org_year_founded, 'org_team_size_range', o.org_team_size_range,
    'favicon_url', o.favicon_url, 'og_image_url', o.og_image_url
  ), o.id
  INTO v_org, v_org_id
  FROM public.organizations o
  WHERE o.slug = org_slug
    AND o.is_blocked IS NOT TRUE
    AND o.portfolio_enabled = true;

  IF v_org IS NULL THEN RETURN NULL; END IF;

  -- Aggregate stats
  SELECT jsonb_build_object(
    'total_content', (SELECT count(*) FROM content WHERE organization_id = v_org_id AND approved_at IS NOT NULL AND (video_url IS NOT NULL OR bunny_embed_url IS NOT NULL)),
    'total_creators', (SELECT count(*) FROM organization_members WHERE organization_id = v_org_id AND role IN ('creator','editor','strategist')),
    'total_views', (SELECT COALESCE(sum(views_count),0) FROM content WHERE organization_id = v_org_id AND approved_at IS NOT NULL),
    'total_likes', (SELECT COALESCE(sum(likes_count),0) FROM content WHERE organization_id = v_org_id AND approved_at IS NOT NULL)
  ) INTO v_stats;

  -- Fetch random approved content with video
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_content
  FROM (
    SELECT c.id, c.title, c.description, c.video_url, c.bunny_embed_url, c.thumbnail_url,
      c.status::text, COALESCE(c.views_count,0) as views_count, COALESCE(c.likes_count,0) as likes_count,
      c.approved_at, c.created_at, c.sphere_phase::text,
      p.full_name AS creator_name, p.avatar_url AS creator_avatar
    FROM public.content c
    LEFT JOIN public.profiles p ON p.id = c.creator_id
    WHERE c.organization_id = v_org_id
      AND c.approved_at IS NOT NULL
      AND (c.video_url IS NOT NULL OR c.bunny_embed_url IS NOT NULL)
    ORDER BY random()
    LIMIT LEAST(max_items, 50)
  ) t;

  RETURN jsonb_build_object('org', v_org, 'stats', v_stats, 'content', v_content);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_org_content_page(text, int) TO anon, authenticated;

-- 3. Performance index
CREATE INDEX IF NOT EXISTS idx_content_org_approved_video
  ON public.content(organization_id)
  WHERE approved_at IS NOT NULL
    AND (video_url IS NOT NULL OR bunny_embed_url IS NOT NULL);
