-- ============================================
-- MIGRACIÓN: Agregar campo género a profiles
-- Fecha: 2026-03-05
-- Descripción: Agrega el campo gender para el onboarding
-- ============================================

-- Agregar columna gender
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT
  CHECK (gender IN ('male', 'female', 'other'));

-- Índice para consultas
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender);

-- ============================================
-- Actualizar RPC: save_profile_data para incluir gender
-- ============================================
CREATE OR REPLACE FUNCTION save_profile_data(
  p_user_id UUID,
  p_full_name TEXT,
  p_username TEXT,
  p_phone TEXT,
  p_country TEXT,
  p_city TEXT,
  p_address TEXT,
  p_nationality TEXT,
  p_document_type TEXT,
  p_document_number TEXT,
  p_date_of_birth DATE,
  p_social_instagram TEXT DEFAULT NULL,
  p_social_facebook TEXT DEFAULT NULL,
  p_social_tiktok TEXT DEFAULT NULL,
  p_social_x TEXT DEFAULT NULL,
  p_social_youtube TEXT DEFAULT NULL,
  p_social_linkedin TEXT DEFAULT NULL,
  p_gender TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_username_normalized TEXT;
  v_age INT;
BEGIN
  v_username_normalized := lower(trim(p_username));

  -- Verificar username único
  IF NOT check_username_available(v_username_normalized, p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'username_taken');
  END IF;

  -- Verificar edad >= 18
  v_age := (CURRENT_DATE - p_date_of_birth) / 365;
  IF v_age < 18 THEN
    RETURN jsonb_build_object('success', false, 'error', 'age_under_18', 'age', v_age);
  END IF;

  -- Actualizar perfil
  UPDATE profiles SET
    full_name = p_full_name,
    username = v_username_normalized,
    phone = p_phone,
    country = p_country,
    city = p_city,
    address = p_address,
    nationality = p_nationality,
    document_type = p_document_type,
    document_number = p_document_number,
    date_of_birth = p_date_of_birth,
    gender = NULLIF(trim(p_gender), ''),
    social_instagram = NULLIF(trim(p_social_instagram), ''),
    social_facebook = NULLIF(trim(p_social_facebook), ''),
    social_tiktok = NULLIF(trim(p_social_tiktok), ''),
    social_x = NULLIF(trim(p_social_x), ''),
    social_youtube = NULLIF(trim(p_social_youtube), ''),
    social_linkedin = NULLIF(trim(p_social_linkedin), ''),
    -- También actualizar los campos legacy para compatibilidad
    instagram = NULLIF(trim(p_social_instagram), ''),
    facebook = NULLIF(trim(p_social_facebook), ''),
    tiktok = NULLIF(trim(p_social_tiktok), ''),
    profile_completed = true,
    profile_completed_at = NOW(),
    age_verified = true,
    age_verified_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON COLUMN profiles.gender IS 'Género del usuario: male, female, other';

-- Notificar cambio de esquema
NOTIFY pgrst, 'reload schema';
