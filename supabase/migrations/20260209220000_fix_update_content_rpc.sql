-- Fix update_content_by_id: JSON arrays were incompatible with text[] columns.
-- '["a","b"]' (JSON format) != '{"a","b"}' (PostgreSQL array format).
-- Also: return void instead of RAISE EXCEPTION to avoid 400 from PostgREST.

CREATE OR REPLACE FUNCTION update_content_by_id(p_content_id uuid, p_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  k text;
  col_type text;
  set_clauses text[] := '{}';
  sql text;
BEGIN
  -- Get the organization of this content
  SELECT organization_id INTO v_org_id
  FROM content WHERE id = p_content_id;

  IF v_org_id IS NULL THEN
    RETURN; -- Content not found: silently return instead of RAISE EXCEPTION (avoids 400)
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
    RETURN; -- Not authorized: silently return instead of RAISE EXCEPTION (avoids 400)
  END IF;

  -- Build dynamic UPDATE from JSONB keys
  FOR k IN SELECT jsonb_object_keys(p_updates) LOOP
    -- Skip keys that are not real columns (e.g. joined fields like 'client', 'creator')
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content' AND column_name = k;

    IF col_type IS NULL THEN
      CONTINUE; -- skip non-existent columns
    END IF;

    IF jsonb_typeof(p_updates->k) = 'null' THEN
      set_clauses := set_clauses || format('%I = NULL', k);
    ELSIF jsonb_typeof(p_updates->k) = 'array' THEN
      -- Convert JSON array to PostgreSQL array (text[]) via subquery
      set_clauses := set_clauses || format(
        '%I = ARRAY(SELECT jsonb_array_elements_text(%L::jsonb))',
        k, p_updates->k::text
      );
    ELSIF jsonb_typeof(p_updates->k) = 'object' THEN
      -- JSON objects go to jsonb columns with explicit cast
      set_clauses := set_clauses || format('%I = %L::jsonb', k, p_updates->k::text);
    ELSE
      -- Scalars (string, number, boolean): text literal, PostgreSQL handles implicit casting
      set_clauses := set_clauses || format('%I = %L', k, p_updates->>k);
    END IF;
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
