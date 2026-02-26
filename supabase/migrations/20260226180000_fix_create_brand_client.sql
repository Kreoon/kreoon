-- Fix create_brand_client function to check brands.owner_id for new brands
-- The issue was that when creating a new brand, the brand_members row doesn't exist yet
-- so we need to also check if the user is the owner_id in the brands table

CREATE OR REPLACE FUNCTION create_brand_client(p_brand_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_client_id UUID;
    v_brand_name TEXT;
    v_is_owner BOOLEAN;
BEGIN
    -- Check if user is owner in brand_members (may not exist yet for new brands)
    SELECT EXISTS (
        SELECT 1 FROM brand_members
        WHERE brand_id = p_brand_id
        AND user_id = p_user_id
        AND role = 'owner'
        AND status = 'active'
    ) INTO v_is_owner;

    -- If not owner in brand_members, check if user is owner_id in brands table
    -- This handles the case of newly created brands where membership doesn't exist yet
    IF NOT v_is_owner THEN
        SELECT EXISTS (
            SELECT 1 FROM brands
            WHERE id = p_brand_id
            AND owner_id = p_user_id
        ) INTO v_is_owner;
    END IF;

    IF NOT v_is_owner THEN
        RAISE EXCEPTION 'Usuario no es owner de la brand';
    END IF;

    -- Check if client already exists for this brand
    SELECT id INTO v_client_id
    FROM clients
    WHERE brand_id = p_brand_id
    LIMIT 1;

    IF v_client_id IS NOT NULL THEN
        -- Already exists, ensure user is in client_users
        INSERT INTO client_users (client_id, user_id, role)
        VALUES (v_client_id, p_user_id, 'owner')
        ON CONFLICT (client_id, user_id) DO NOTHING;

        RETURN v_client_id;
    END IF;

    -- Get brand name
    SELECT name INTO v_brand_name FROM brands WHERE id = p_brand_id;

    -- Create the client
    INSERT INTO clients (
        name,
        brand_id,
        is_internal_brand,
        is_public,
        bio,
        created_by
    ) VALUES (
        v_brand_name,
        p_brand_id,
        false,
        false,
        'Cliente de marca independiente: ' || v_brand_name,
        p_user_id
    )
    RETURNING id INTO v_client_id;

    -- Add owner as client user
    INSERT INTO client_users (client_id, user_id, role)
    VALUES (v_client_id, p_user_id, 'owner');

    RETURN v_client_id;
END;
$$;
