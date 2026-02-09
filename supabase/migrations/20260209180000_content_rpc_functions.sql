-- SECURITY DEFINER functions for content table operations.
-- These bypass the 18 RLS policies on the content table by checking
-- authorization once (org membership) instead of per-row evaluation.

-- Fetch a single content row by ID (bypasses RLS)
CREATE OR REPLACE FUNCTION get_content_by_id(p_content_id uuid)
RETURNS SETOF content
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Get the organization of this content
  SELECT organization_id INTO v_org_id
  FROM content WHERE id = p_content_id;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  -- Verify caller is a member of that organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_member_roles
    WHERE organization_id = v_org_id AND user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM client_users cu
    JOIN clients c ON c.id = cu.client_id
    WHERE c.organization_id = v_org_id AND cu.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY SELECT * FROM content WHERE id = p_content_id;
END;
$$;

-- Update a content row by ID using JSONB payload (bypasses RLS)
DROP FUNCTION IF EXISTS update_content_by_id(uuid, jsonb);
CREATE OR REPLACE FUNCTION update_content_by_id(p_content_id uuid, p_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  k text;
  v text;
  set_clauses text[] := '{}';
  sql text;
BEGIN
  -- Get the organization of this content
  SELECT organization_id INTO v_org_id
  FROM content WHERE id = p_content_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Content not found';
  END IF;

  -- Verify caller is a member of that organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_member_roles
    WHERE organization_id = v_org_id AND user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM client_users cu
    JOIN clients c ON c.id = cu.client_id
    WHERE c.organization_id = v_org_id AND cu.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Build dynamic UPDATE from JSONB keys
  FOR k IN SELECT jsonb_object_keys(p_updates) LOOP
    -- Use parameterized values via format to prevent SQL injection
    set_clauses := set_clauses || format('%I = %L', k,
      CASE
        WHEN jsonb_typeof(p_updates->k) = 'null' THEN NULL
        WHEN jsonb_typeof(p_updates->k) = 'string' THEN p_updates->>k
        WHEN jsonb_typeof(p_updates->k) = 'boolean' THEN p_updates->>k
        WHEN jsonb_typeof(p_updates->k) = 'number' THEN p_updates->>k
        WHEN jsonb_typeof(p_updates->k) = 'array' THEN p_updates->k::text
        ELSE p_updates->>k
      END
    );
  END LOOP;

  IF array_length(set_clauses, 1) IS NULL THEN
    RETURN; -- nothing to update
  END IF;

  sql := format('UPDATE content SET %s WHERE id = %L',
    array_to_string(set_clauses, ', '),
    p_content_id
  );
  EXECUTE sql;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_content_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_content_by_id(uuid, jsonb) TO authenticated;
