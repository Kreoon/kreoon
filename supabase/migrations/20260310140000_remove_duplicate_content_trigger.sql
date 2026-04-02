-- ============================================================================
-- ELIMINAR TRIGGER DE DUPLICADOS DE CONTENIDO
-- ============================================================================
-- Los nombres de contenido PUEDEN ser iguales.
-- El único identificador único es sequence_number (V-00001, V-00002, etc.)
-- que se genera automáticamente y de forma consecutiva.
-- ============================================================================

-- Eliminar triggers que bloqueaban duplicados
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_content ON content;
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_content_update ON content;

-- Eliminar la función (ya no se usa)
DROP FUNCTION IF EXISTS prevent_duplicate_content();

-- Comentario para documentar la decisión
COMMENT ON TABLE content IS 'Contenido/proyectos de video. Los títulos PUEDEN repetirse. El identificador único es sequence_number (V-XXXXX).';
