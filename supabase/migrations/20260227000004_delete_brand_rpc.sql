-- ============================================================================
-- RPC: Eliminar marca completa (solo para platform root)
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_brand_complete(p_brand_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_client_id UUID;
    v_owner_id UUID;
BEGIN
    -- Verificar que el usuario es platform root
    IF NOT public.is_platform_root(auth.uid()) THEN
        RAISE EXCEPTION 'Solo platform root puede eliminar marcas';
    END IF;

    -- Obtener el owner_id de la marca
    SELECT owner_id INTO v_owner_id
    FROM brands
    WHERE id = p_brand_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Marca no encontrada';
    END IF;

    -- Obtener el client_id asociado
    SELECT id INTO v_client_id
    FROM clients
    WHERE brand_id = p_brand_id;

    -- Si hay cliente asociado, eliminar datos relacionados
    IF v_client_id IS NOT NULL THEN
        -- Eliminar contenido
        DELETE FROM content WHERE client_id = v_client_id;

        -- Eliminar productos
        DELETE FROM products WHERE client_id = v_client_id;

        -- Eliminar paquetes
        DELETE FROM client_packages WHERE client_id = v_client_id;

        -- Eliminar client_users
        DELETE FROM client_users WHERE client_id = v_client_id;

        -- Eliminar client_dna
        DELETE FROM client_dna WHERE client_id = v_client_id;

        -- Eliminar product_dna
        DELETE FROM product_dna WHERE client_id = v_client_id;

        -- Eliminar el cliente
        DELETE FROM clients WHERE id = v_client_id;
    END IF;

    -- Eliminar miembros de la marca
    DELETE FROM brand_members WHERE brand_id = p_brand_id;

    -- Limpiar active_brand_id del owner
    IF v_owner_id IS NOT NULL THEN
        UPDATE profiles
        SET active_brand_id = NULL, active_role = NULL
        WHERE id = v_owner_id AND active_brand_id = p_brand_id;
    END IF;

    -- Eliminar la marca
    DELETE FROM brands WHERE id = p_brand_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION delete_brand_complete(UUID) TO authenticated;

-- Notificar a PostgREST
NOTIFY pgrst, 'reload schema';
