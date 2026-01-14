-- Populate UP V2 tables with historical data from content

-- Insert creator records from historical content
INSERT INTO up_creadores (
  user_id, content_id, organization_id, event_type, points, 
  recording_started_at, recorded_at, days_to_deliver, created_at
)
SELECT 
  c.creator_id,
  c.id,
  c.organization_id,
  CASE 
    WHEN COALESCE(EXTRACT(EPOCH FROM (c.recorded_at - c.recording_at)) / 86400, 4)::int <= 3 THEN 'early_delivery'
    WHEN COALESCE(EXTRACT(EPOCH FROM (c.recorded_at - c.recording_at)) / 86400, 4)::int <= 4 THEN 'on_time_delivery'
    WHEN COALESCE(EXTRACT(EPOCH FROM (c.recorded_at - c.recording_at)) / 86400, 4)::int <= 5 THEN 'slight_delay'
    WHEN COALESCE(EXTRACT(EPOCH FROM (c.recorded_at - c.recording_at)) / 86400, 4)::int <= 6 THEN 'late_delivery'
    ELSE 'very_late_delivery'
  END,
  CASE 
    WHEN COALESCE(EXTRACT(EPOCH FROM (c.recorded_at - c.recording_at)) / 86400, 4)::int <= 3 THEN 15
    WHEN COALESCE(EXTRACT(EPOCH FROM (c.recorded_at - c.recording_at)) / 86400, 4)::int <= 4 THEN 10
    WHEN COALESCE(EXTRACT(EPOCH FROM (c.recorded_at - c.recording_at)) / 86400, 4)::int <= 5 THEN 5
    WHEN COALESCE(EXTRACT(EPOCH FROM (c.recorded_at - c.recording_at)) / 86400, 4)::int <= 6 THEN 0
    ELSE -5
  END,
  c.recording_at,
  c.recorded_at,
  COALESCE(EXTRACT(EPOCH FROM (c.recorded_at - c.recording_at)) / 86400, 4)::int,
  COALESCE(c.recorded_at, NOW())
FROM content c
WHERE c.creator_id IS NOT NULL
  AND c.organization_id IS NOT NULL
  AND c.status IN ('delivered', 'approved', 'paid', 'recorded')
  AND c.recorded_at IS NOT NULL
  AND c.recording_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM up_creadores uc 
    WHERE uc.content_id = c.id 
      AND uc.user_id = c.creator_id 
      AND uc.event_type LIKE '%delivery%'
  );

-- Insert clean approval bonus for creators (content approved without issues)
INSERT INTO up_creadores (user_id, content_id, organization_id, event_type, points, approved_at, created_at)
SELECT 
  c.creator_id,
  c.id,
  c.organization_id,
  'clean_approval_bonus',
  5,
  c.approved_at,
  c.approved_at
FROM content c
WHERE c.creator_id IS NOT NULL
  AND c.organization_id IS NOT NULL
  AND c.status IN ('approved', 'paid')
  AND c.approved_at IS NOT NULL
  AND c.issue_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM up_creadores uc 
    WHERE uc.content_id = c.id 
      AND uc.user_id = c.creator_id 
      AND uc.event_type = 'clean_approval_bonus'
  );

-- Insert issue penalties for creators
INSERT INTO up_creadores (user_id, content_id, organization_id, event_type, points, issue_at, created_at)
SELECT 
  c.creator_id,
  c.id,
  c.organization_id,
  'issue_penalty',
  -10,
  c.issue_at,
  c.issue_at
FROM content c
WHERE c.creator_id IS NOT NULL
  AND c.organization_id IS NOT NULL
  AND c.issue_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM up_creadores uc 
    WHERE uc.content_id = c.id 
      AND uc.user_id = c.creator_id 
      AND uc.event_type = 'issue_penalty'
  );