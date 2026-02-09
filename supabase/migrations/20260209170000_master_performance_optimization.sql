-- =============================================================================
-- MASTER PERFORMANCE OPTIMIZATION
-- Addresses tables with highest sequential scan counts from pg_stat_user_tables
-- =============================================================================

-- 1. NOTIFICATIONS (3.8M rows read, only PK index, 1080 rows)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications (user_id, is_read)
  WHERE is_read = false;

-- 2. USER_NOTIFICATIONS (2.5M rows read, only PK index, 1034 rows)
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id
  ON user_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_org_id
  ON user_notifications (organization_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read
  ON user_notifications (user_id, is_read)
  WHERE is_read = false;

-- 3. USER_ACHIEVEMENTS (709K rows read, 376 rows)
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id
  ON user_achievements (user_id);

-- 4. PORTFOLIO_POSTS (216K rows read, 158 rows)
CREATE INDEX IF NOT EXISTS idx_portfolio_posts_user_id
  ON portfolio_posts (user_id);

-- 5. CREATOR_PROFILES (48K rows read, 69 rows)
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id
  ON creator_profiles (user_id);

-- 6. USER_SUBSCRIPTIONS (38K rows read, 73 rows)
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id
  ON user_subscriptions (user_id);

-- 7. Force statistics refresh on all high-traffic tables
ANALYZE user_roles;
ANALYZE organization_members;
ANALYZE organization_member_roles;
ANALYZE profiles;
ANALYZE content;
ANALYZE clients;
ANALYZE client_users;
ANALYZE notifications;
ANALYZE user_notifications;
ANALYZE user_achievements;
ANALYZE user_presence;
ANALYZE portfolio_posts;
ANALYZE creator_profiles;
