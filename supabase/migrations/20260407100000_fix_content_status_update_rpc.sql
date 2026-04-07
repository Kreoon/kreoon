-- Migration: Fix content status update with robust SECURITY DEFINER RPC
-- This addresses the "invalid column for filter user_id" errors when editors
-- try to change content status from editing to delivered.

-- Create a robust RPC function for content status change
-- This function handles everything server-side to avoid RLS issues
CREATE OR REPLACE FUNCTION update_content_status_with_up(
  p_content_id UUID,
  p_old_status TEXT,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content RECORD;
  v_org_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Get content with all needed fields
  SELECT c.*
  INTO v_content
  FROM content c
  WHERE c.id = p_content_id;

  IF v_content IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Content not found');
  END IF;

  v_org_id := v_content.organization_id;

  -- Verify caller is authorized (member of the organization or client user)
  IF NOT EXISTS (
    SELECT 1 FROM organization_member_roles omr
    WHERE omr.organization_id = v_org_id AND omr.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM client_users cu
    JOIN clients cl ON cl.id = cu.client_id
    WHERE cl.organization_id = v_org_id AND cu.user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Update the content with proper timestamps based on new status
  UPDATE content
  SET
    status = p_new_status,
    recording_at = CASE WHEN p_new_status = 'recording' THEN v_now ELSE recording_at END,
    recorded_at = CASE WHEN p_new_status = 'recorded' THEN v_now ELSE recorded_at END,
    editing_at = CASE WHEN p_new_status = 'editing' THEN v_now ELSE editing_at END,
    delivered_at = CASE WHEN p_new_status = 'delivered' THEN v_now ELSE delivered_at END,
    issue_at = CASE WHEN p_new_status = 'issue' THEN v_now ELSE issue_at END,
    corrected_at = CASE WHEN p_new_status = 'corrected' THEN v_now ELSE corrected_at END,
    approved_at = CASE WHEN p_new_status = 'approved' THEN v_now ELSE approved_at END,
    paid_at = CASE WHEN p_new_status = 'paid' THEN v_now ELSE paid_at END,
    updated_at = v_now
  WHERE id = p_content_id;

  -- Note: UP points are handled by existing triggers on the content table
  -- The triggers emit_up_event_on_status_change and trigger_emit_up_event_on_status
  -- will automatically fire and handle UP point calculations

  RETURN jsonb_build_object(
    'success', true,
    'content_id', p_content_id,
    'new_status', p_new_status
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION update_content_status_with_up(UUID, TEXT, TEXT) TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION update_content_status_with_up IS
'Updates content status with proper timestamps. Runs as SECURITY DEFINER to bypass RLS.
Triggers will handle UP points automatically. Used by editors to change status without RLS errors.';
