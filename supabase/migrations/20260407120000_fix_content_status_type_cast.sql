-- Migration: Fix content_status type cast in RPC function
-- The issue: p_new_status is TEXT but status column is content_status enum
-- Solution: Cast TEXT to content_status enum type

-- Drop and recreate the function with proper type casting
CREATE OR REPLACE FUNCTION update_content_status_rpc(
  p_content_id UUID,
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
  v_old_status TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Get content with current status
  SELECT c.*, c.status::TEXT as current_status
  INTO v_content
  FROM content c
  WHERE c.id = p_content_id;

  IF v_content IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Content not found');
  END IF;

  v_org_id := v_content.organization_id;
  v_old_status := v_content.current_status;

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

  -- Update the content with proper type casting (TEXT -> content_status enum)
  UPDATE content
  SET
    status = p_new_status::content_status,  -- CRITICAL: Cast TEXT to enum
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

  -- Return success with old and new status for UP point calculation
  RETURN jsonb_build_object(
    'success', true,
    'content_id', p_content_id,
    'old_status', v_old_status,
    'new_status', p_new_status
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Ensure grant exists
GRANT EXECUTE ON FUNCTION update_content_status_rpc(UUID, TEXT) TO authenticated;

-- Also fix the older function with same issue
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

  -- Update the content with proper timestamps and type casting
  UPDATE content
  SET
    status = p_new_status::content_status,  -- CRITICAL: Cast TEXT to enum
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

  RETURN jsonb_build_object(
    'success', true,
    'content_id', p_content_id,
    'new_status', p_new_status
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Ensure grant exists
GRANT EXECUTE ON FUNCTION update_content_status_with_up(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION update_content_status_rpc IS
'Updates content status with proper TEXT to content_status enum casting.
Runs as SECURITY DEFINER to bypass RLS. Returns old_status and new_status for UP calculations.';
