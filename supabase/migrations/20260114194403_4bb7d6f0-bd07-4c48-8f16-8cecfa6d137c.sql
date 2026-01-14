-- Populate UP V2 tables with historical editor data

-- Get editor table columns first
-- Insert editor records from historical content
INSERT INTO up_editores (
  user_id, content_id, organization_id, event_type, points, 
  editing_started_at, delivered_at, days_to_deliver, created_at
)
SELECT 
  c.editor_id,
  c.id,
  c.organization_id,
  CASE 
    WHEN COALESCE(EXTRACT(EPOCH FROM (c.delivered_at - c.editing_at)) / 86400, 2)::int <= 1 THEN 'early_delivery'
    WHEN COALESCE(EXTRACT(EPOCH FROM (c.delivered_at - c.editing_at)) / 86400, 2)::int <= 2 THEN 'on_time_delivery'
    WHEN COALESCE(EXTRACT(EPOCH FROM (c.delivered_at - c.editing_at)) / 86400, 2)::int <= 3 THEN 'slight_delay'
    WHEN COALESCE(EXTRACT(EPOCH FROM (c.delivered_at - c.editing_at)) / 86400, 2)::int <= 4 THEN 'late_delivery'
    ELSE 'very_late_delivery'
  END,
  CASE 
    WHEN COALESCE(EXTRACT(EPOCH FROM (c.delivered_at - c.editing_at)) / 86400, 2)::int <= 1 THEN 15
    WHEN COALESCE(EXTRACT(EPOCH FROM (c.delivered_at - c.editing_at)) / 86400, 2)::int <= 2 THEN 10
    WHEN COALESCE(EXTRACT(EPOCH FROM (c.delivered_at - c.editing_at)) / 86400, 2)::int <= 3 THEN 5
    WHEN COALESCE(EXTRACT(EPOCH FROM (c.delivered_at - c.editing_at)) / 86400, 2)::int <= 4 THEN 0
    ELSE -5
  END,
  c.editing_at,
  c.delivered_at,
  COALESCE(EXTRACT(EPOCH FROM (c.delivered_at - c.editing_at)) / 86400, 2)::int,
  COALESCE(c.delivered_at, NOW())
FROM content c
WHERE c.editor_id IS NOT NULL
  AND c.organization_id IS NOT NULL
  AND c.status IN ('delivered', 'approved', 'paid')
  AND c.delivered_at IS NOT NULL
  AND c.editing_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM up_editores ue 
    WHERE ue.content_id = c.id 
      AND ue.user_id = c.editor_id 
      AND ue.event_type LIKE '%delivery%'
  );

-- Insert clean approval bonus for editors
INSERT INTO up_editores (user_id, content_id, organization_id, event_type, points, approved_at, created_at)
SELECT 
  c.editor_id,
  c.id,
  c.organization_id,
  'clean_approval_bonus',
  5,
  c.approved_at,
  c.approved_at
FROM content c
WHERE c.editor_id IS NOT NULL
  AND c.organization_id IS NOT NULL
  AND c.status IN ('approved', 'paid')
  AND c.approved_at IS NOT NULL
  AND c.issue_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM up_editores ue 
    WHERE ue.content_id = c.id 
      AND ue.user_id = c.editor_id 
      AND ue.event_type = 'clean_approval_bonus'
  );

-- Insert issue penalties for editors
INSERT INTO up_editores (user_id, content_id, organization_id, event_type, points, issue_at, created_at)
SELECT 
  c.editor_id,
  c.id,
  c.organization_id,
  'issue_penalty',
  -10,
  c.issue_at,
  c.issue_at
FROM content c
WHERE c.editor_id IS NOT NULL
  AND c.organization_id IS NOT NULL
  AND c.issue_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM up_editores ue 
    WHERE ue.content_id = c.id 
      AND ue.user_id = c.editor_id 
      AND ue.event_type = 'issue_penalty'
  );