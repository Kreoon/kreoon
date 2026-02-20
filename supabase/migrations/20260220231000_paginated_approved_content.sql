-- ============================================================================
-- RPC: get_approved_content_for_social (v2 - paginated + filters)
-- Replaces v1: adds pagination, server-side filters, and total_count
-- ============================================================================

-- Drop old single-param version
DROP FUNCTION IF EXISTS get_approved_content_for_social(UUID);

CREATE OR REPLACE FUNCTION get_approved_content_for_social(
  p_org_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_sphere_phase TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  video_url TEXT,
  video_urls TEXT[],
  thumbnail_url TEXT,
  bunny_embed_url TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  client_id UUID,
  client_name TEXT,
  client_logo_url TEXT,
  product_id UUID,
  product_name TEXT,
  creator_id UUID,
  creator_name TEXT,
  creator_avatar TEXT,
  editor_id UUID,
  editor_name TEXT,
  sphere_phase TEXT,
  target_platform TEXT,
  content_objective TEXT,
  hook TEXT,
  cta TEXT,
  marketing_campaign_id UUID,
  marketing_campaign_name TEXT,
  sequence_number TEXT,
  total_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.title,
    c.description,
    c.video_url,
    c.video_urls,
    c.thumbnail_url,
    c.bunny_embed_url,
    c.status::TEXT,
    c.created_at,
    c.client_id,
    cl.name AS client_name,
    cl.logo_url AS client_logo_url,
    c.product_id,
    p.name AS product_name,
    c.creator_id,
    pc.full_name AS creator_name,
    pc.avatar_url AS creator_avatar,
    c.editor_id,
    pe.full_name AS editor_name,
    c.sphere_phase::TEXT,
    c.target_platform,
    c.content_objective,
    c.hook,
    c.cta,
    c.marketing_campaign_id,
    mc.name AS marketing_campaign_name,
    c.sequence_number,
    COUNT(*) OVER() AS total_count
  FROM content c
  LEFT JOIN clients cl ON cl.id = c.client_id
  LEFT JOIN products p ON p.id = c.product_id
  LEFT JOIN profiles pc ON pc.id = c.creator_id
  LEFT JOIN profiles pe ON pe.id = c.editor_id
  LEFT JOIN marketing_campaigns mc ON mc.id = c.marketing_campaign_id
  WHERE c.organization_id = p_org_id
    AND c.status IN ('approved', 'paid', 'en_campaa')
    AND (p_client_id IS NULL OR c.client_id = p_client_id)
    AND (p_status IS NULL OR c.status::TEXT = p_status)
    AND (p_sphere_phase IS NULL OR c.sphere_phase::TEXT = p_sphere_phase)
    AND (p_search IS NULL OR p_search = '' OR
         c.title ILIKE '%' || p_search || '%' OR
         cl.name ILIKE '%' || p_search || '%' OR
         pc.full_name ILIKE '%' || p_search || '%' OR
         p.name ILIKE '%' || p_search || '%' OR
         c.sequence_number ILIKE '%' || p_search || '%')
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION get_approved_content_for_social(UUID, INT, INT, TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_approved_content_for_social(UUID, INT, INT, TEXT, UUID, TEXT, TEXT) TO service_role;
