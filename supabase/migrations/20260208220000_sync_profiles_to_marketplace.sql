-- Migration: Sync existing profiles to marketplace creator_profiles
-- Populates creator_profiles from profiles that have published content or marketplace enabled
-- Also migrates portfolio_posts and published content to portfolio_items

-- ── Step 1: Create creator_profiles from existing profiles ────────────────

INSERT INTO public.creator_profiles (
  user_id,
  display_name,
  slug,
  bio,
  avatar_url,
  location_city,
  location_country,
  categories,
  languages,
  social_links,
  base_price,
  currency,
  is_available,
  is_active,
  rating_avg,
  completed_projects,
  platforms
)
SELECT
  p.id,
  COALESCE(p.full_name, 'Creador'),
  p.username,
  p.bio,
  p.avatar_url,
  p.city,
  COALESCE(p.country, 'CO'),
  COALESCE(p.content_categories, '{}'),
  COALESCE(p.languages, '{es}'),
  jsonb_build_object(
    'instagram', COALESCE(p.instagram, ''),
    'tiktok', COALESCE(p.tiktok, '')
  ) - '' ,  -- remove empty values
  p.minimum_budget,
  'USD',
  COALESCE(p.is_available_for_hire, true),
  true,
  COALESCE(p.avg_rating, 0),
  COALESCE(p.total_contracts_completed, 0),
  '{}'::text[]
FROM public.profiles p
WHERE p.id NOT IN (SELECT user_id FROM public.creator_profiles)
  AND (
    p.marketplace_enabled = true
    OR EXISTS (
      SELECT 1 FROM public.content c
      WHERE c.creator_id = p.id
        AND c.is_published = true
        AND (c.video_url IS NOT NULL OR c.bunny_embed_url IS NOT NULL)
    )
    OR EXISTS (
      SELECT 1 FROM public.portfolio_posts pp
      WHERE pp.user_id = p.id
    )
  )
ON CONFLICT (user_id) DO NOTHING;

-- ── Step 2: Migrate published content videos to portfolio_items ──────────

INSERT INTO public.portfolio_items (
  creator_id,
  title,
  media_type,
  media_url,
  thumbnail_url,
  bunny_video_id,
  is_public,
  is_featured,
  display_order,
  category
)
SELECT
  cp.id,
  c.title,
  'video',
  COALESCE(
    (c.video_urls::text[])[1],   -- Direct CDN URL first
    c.bunny_embed_url,            -- Then embed URL
    c.video_url                   -- Then legacy video_url
  ),
  c.thumbnail_url,
  -- Extract bunny video ID from embed URL
  CASE
    WHEN c.bunny_embed_url ~ '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'
    THEN (regexp_match(c.bunny_embed_url, '([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})'))[1]
    ELSE NULL
  END,
  true,
  false,
  ROW_NUMBER() OVER (PARTITION BY cp.id ORDER BY c.created_at DESC) - 1,
  NULL
FROM public.content c
JOIN public.creator_profiles cp ON cp.user_id = c.creator_id
WHERE c.is_published = true
  AND (c.video_url IS NOT NULL OR c.bunny_embed_url IS NOT NULL OR c.video_urls IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM public.portfolio_items pi
    WHERE pi.creator_id = cp.id
      AND pi.media_url = COALESCE(
        (c.video_urls::text[])[1],
        c.bunny_embed_url,
        c.video_url
      )
  )
LIMIT 500;  -- Safety limit for initial migration

-- ── Step 3: Migrate portfolio_posts (videos and images) to portfolio_items ──

INSERT INTO public.portfolio_items (
  creator_id,
  title,
  media_type,
  media_url,
  thumbnail_url,
  is_public,
  is_featured,
  display_order
)
SELECT
  cp.id,
  pp.caption,
  pp.media_type,
  pp.media_url,
  pp.thumbnail_url,
  true,
  false,
  (
    SELECT COALESCE(MAX(pi2.display_order), -1) + 1
    FROM public.portfolio_items pi2
    WHERE pi2.creator_id = cp.id
  ) + ROW_NUMBER() OVER (PARTITION BY cp.id ORDER BY pp.created_at DESC) - 1
FROM public.portfolio_posts pp
JOIN public.creator_profiles cp ON cp.user_id = pp.user_id
WHERE pp.media_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.portfolio_items pi
    WHERE pi.creator_id = cp.id
      AND pi.media_url = pp.media_url
  )
LIMIT 1000;  -- Safety limit

-- ── Step 4: Create a reusable function for future syncs ──────────────────

CREATE OR REPLACE FUNCTION public.sync_profile_to_marketplace(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  creator_id uuid;
BEGIN
  -- Check if already exists
  SELECT id INTO creator_id
  FROM public.creator_profiles
  WHERE user_id = target_user_id;

  IF creator_id IS NOT NULL THEN
    RETURN creator_id;
  END IF;

  -- Create creator_profile from profiles
  INSERT INTO public.creator_profiles (
    user_id, display_name, slug, bio, avatar_url,
    location_city, location_country, categories, languages,
    social_links, base_price, is_available, is_active
  )
  SELECT
    p.id,
    COALESCE(p.full_name, 'Creador'),
    p.username,
    p.bio,
    p.avatar_url,
    p.city,
    COALESCE(p.country, 'CO'),
    COALESCE(p.content_categories, '{}'),
    COALESCE(p.languages, '{es}'),
    jsonb_build_object(
      'instagram', COALESCE(p.instagram, ''),
      'tiktok', COALESCE(p.tiktok, '')
    ),
    p.minimum_budget,
    COALESCE(p.is_available_for_hire, true),
    true
  FROM public.profiles p
  WHERE p.id = target_user_id
  RETURNING id INTO creator_id;

  -- Migrate content videos
  INSERT INTO public.portfolio_items (
    creator_id, title, media_type, media_url, thumbnail_url, bunny_video_id,
    is_public, display_order
  )
  SELECT
    creator_id,
    c.title,
    'video',
    COALESCE((c.video_urls::text[])[1], c.bunny_embed_url, c.video_url),
    c.thumbnail_url,
    CASE
      WHEN c.bunny_embed_url ~ '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'
      THEN (regexp_match(c.bunny_embed_url, '([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})'))[1]
      ELSE NULL
    END,
    true,
    ROW_NUMBER() OVER (ORDER BY c.created_at DESC) - 1
  FROM public.content c
  WHERE c.creator_id = target_user_id
    AND c.is_published = true
    AND (c.video_url IS NOT NULL OR c.bunny_embed_url IS NOT NULL);

  -- Migrate portfolio posts
  INSERT INTO public.portfolio_items (
    creator_id, title, media_type, media_url, thumbnail_url,
    is_public, display_order
  )
  SELECT
    creator_id,
    pp.caption,
    pp.media_type,
    pp.media_url,
    pp.thumbnail_url,
    true,
    (SELECT COALESCE(MAX(display_order), -1) + 1 FROM public.portfolio_items WHERE portfolio_items.creator_id = sync_profile_to_marketplace.creator_id)
      + ROW_NUMBER() OVER (ORDER BY pp.created_at DESC) - 1
  FROM public.portfolio_posts pp
  WHERE pp.user_id = target_user_id
    AND pp.media_url IS NOT NULL;

  RETURN creator_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.sync_profile_to_marketplace(uuid) TO authenticated;
