-- Funcion RPC para obtener items de portafolio aleatorios con limite
-- Featured items siempre aparecen primero, luego aleatorio

CREATE OR REPLACE FUNCTION get_portfolio_items_random(
  p_creator_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS SETOF portfolio_items AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM portfolio_items
  WHERE creator_id = p_creator_id
    AND is_public = true
  ORDER BY
    is_featured DESC,
    RANDOM()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_portfolio_items_random IS 'Obtiene hasta N items de portafolio en orden aleatorio. Featured primero.';
