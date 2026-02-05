-- =====================================================
-- FIX: Tighten permissive RLS policies
-- products, notifications, goals
-- =====================================================

-- PRODUCTS: Restrict to org members via client ownership
DROP POLICY IF EXISTS "Authenticated can view products" ON products;
CREATE POLICY "Users can view products in their org"
  ON products FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- NOTIFICATIONS: Restrict to own notifications only
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;
CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- GOALS: Restrict to org members
DROP POLICY IF EXISTS "Authenticated can view goals" ON goals;
CREATE POLICY "Org members can view goals"
  ON goals FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );
