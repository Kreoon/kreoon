-- ============================================================================
-- MIGRATION: user_specializations table
-- Date: 2026-03-30
-- Description: Tabla para almacenar especializaciones de usuarios
-- ============================================================================

-- Crear tabla user_specializations
CREATE TABLE IF NOT EXISTS user_specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  specialization TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, specialization)
);

-- Comentario de tabla
COMMENT ON TABLE user_specializations IS 'Especializaciones seleccionadas por usuarios (max 5 por usuario)';
COMMENT ON COLUMN user_specializations.specialization IS 'ID de especializacion: ugc, video_editor, seo, etc.';

-- Indices para busquedas
CREATE INDEX IF NOT EXISTS idx_user_specializations_user ON user_specializations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_specializations_spec ON user_specializations(specialization);

-- Habilitar RLS
ALTER TABLE user_specializations ENABLE ROW LEVEL SECURITY;

-- Politica: Usuarios pueden ver sus propias especializaciones
CREATE POLICY "Users can view own specializations"
  ON user_specializations FOR SELECT
  USING (auth.uid() = user_id);

-- Politica: Usuarios pueden gestionar sus propias especializaciones
CREATE POLICY "Users can insert own specializations"
  ON user_specializations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own specializations"
  ON user_specializations FOR DELETE
  USING (auth.uid() = user_id);

-- Politica: Perfiles publicos permiten ver especializaciones
CREATE POLICY "Anyone can view specializations of public profiles"
  ON user_specializations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_specializations.user_id
      AND profiles.is_public = true
    )
  );

-- Politica: Admins de plataforma pueden ver todas
CREATE POLICY "Platform admins can view all specializations"
  ON user_specializations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_superadmin = true
    )
  );

-- Funcion para validar limite de especializaciones (max 5)
CREATE OR REPLACE FUNCTION check_specializations_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM user_specializations WHERE user_id = NEW.user_id
  ) >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 specializations per user allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar limite antes de insertar
DROP TRIGGER IF EXISTS enforce_specializations_limit ON user_specializations;
CREATE TRIGGER enforce_specializations_limit
  BEFORE INSERT ON user_specializations
  FOR EACH ROW
  EXECUTE FUNCTION check_specializations_limit();
