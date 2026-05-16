-- Fix get_talent_activity_metrics to include editors (not just creators)
-- Root cause: the function only joined content on creator_id, making editors invisible
-- Also: 'approved' status now counts as active (content is done but pending payment)

CREATE OR REPLACE FUNCTION public.get_talent_activity_metrics(
  p_org_id uuid,
  p_days_active integer DEFAULT 30
)
RETURNS TABLE (
  user_id uuid,
  active_content_count bigint,
  completed_content_count bigint,
  pending_payment_count bigint,
  last_activity_date timestamptz
)
LANGUAGE sql
STABLE
AS $$
  WITH all_content AS (
    -- Creator participation
    SELECT
      creator_id        AS user_id,
      status,
      creator_paid      AS paid,
      updated_at
    FROM public.content
    WHERE creator_id IS NOT NULL
      AND organization_id = p_org_id

    UNION ALL

    -- Editor participation
    SELECT
      editor_id         AS user_id,
      status,
      editor_paid       AS paid,
      updated_at
    FROM public.content
    WHERE editor_id IS NOT NULL
      AND organization_id = p_org_id
  ),
  content_stats AS (
    SELECT
      user_id,
      COUNT(*)          FILTER (WHERE status NOT IN ('paid', 'rejected'))::bigint  AS active_content_count,
      COUNT(*)          FILTER (WHERE status = 'paid')::bigint                     AS completed_content_count,
      COUNT(*)          FILTER (WHERE status IN ('approved', 'delivered') AND NOT paid)::bigint AS pending_payment_count,
      MAX(updated_at)                                                               AS last_activity_date
    FROM all_content
    GROUP BY user_id
  ),
  org_members AS (
    SELECT user_id
    FROM public.organization_members
    WHERE organization_id = p_org_id
      AND status = 'active'
  )
  SELECT
    om.user_id,
    COALESCE(cs.active_content_count,   0) AS active_content_count,
    COALESCE(cs.completed_content_count, 0) AS completed_content_count,
    COALESCE(cs.pending_payment_count,   0) AS pending_payment_count,
    cs.last_activity_date
  FROM org_members om
  LEFT JOIN content_stats cs ON cs.user_id = om.user_id;
$$;
