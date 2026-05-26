-- Fix: Agregar RPC atómica para reemplazar especializaciones
-- Soluciona el bug de DELETE+INSERT no atómico que causa "Error al guardar especializaciones"

CREATE OR REPLACE FUNCTION replace_user_specializations(
  p_user_id UUID,
  p_specializations TEXT[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el llamador sea el mismo usuario
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: solo puedes modificar tus propias especializaciones';
  END IF;

  -- Validar límite máximo
  IF p_specializations IS NOT NULL AND array_length(p_specializations, 1) > 5 THEN
    RAISE EXCEPTION 'Máximo 5 especializaciones por usuario';
  END IF;

  -- Eliminar todas las especializaciones existentes del usuario (atómico)
  DELETE FROM user_specializations WHERE user_id = p_user_id;

  -- Insertar las nuevas especializaciones (si hay alguna)
  IF p_specializations IS NOT NULL AND array_length(p_specializations, 1) > 0 THEN
    INSERT INTO user_specializations (user_id, specialization)
    SELECT p_user_id, unnest(p_specializations);
  END IF;
END;
$$;

-- Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION replace_user_specializations(UUID, TEXT[]) TO authenticated;

-- Limpiar políticas RLS duplicadas que se acumularon
DO $$
BEGIN
  -- DELETE policies duplicadas
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_specializations' AND policyname = 'Users can delete own'
  ) THEN
    DROP POLICY "Users can delete own" ON user_specializations;
  END IF;

  -- INSERT policies duplicadas
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_specializations' AND policyname = 'Users can insert own'
  ) THEN
    DROP POLICY "Users can insert own" ON user_specializations;
  END IF;
END;
$$;
