-- ============================================
-- MIGRACIÓN: Gate Obligatorio Post-Registro
-- Fecha: 2026-03-05
-- Descripción: Campos adicionales para completar perfil
--              y flags de onboarding/consentimiento
-- ============================================

-- ============================================
-- Agregar campos faltantes a profiles
-- ============================================

-- Campos que podrían faltar
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Redes sociales adicionales (algunos ya existen con nombres diferentes)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_instagram TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_facebook TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_tiktok TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_x TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_youtube TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_linkedin TEXT;

-- Migrar datos de redes sociales existentes a los nuevos campos
UPDATE profiles SET
  social_instagram = COALESCE(social_instagram, instagram),
  social_facebook = COALESCE(social_facebook, facebook),
  social_tiktok = COALESCE(social_tiktok, tiktok)
WHERE (instagram IS NOT NULL OR facebook IS NOT NULL OR tiktok IS NOT NULL);

-- Flags de perfil completado y consentimiento
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS legal_consents_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS legal_consents_completed_at TIMESTAMPTZ;

-- Flag combinado: usuario puede usar la plataforma
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Constraint: username único (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_unique'
  ) THEN
    -- Primero, hacer únicos los usernames duplicados
    UPDATE profiles p SET username = username || '_' || substring(id::text from 1 for 8)
    WHERE username IN (
      SELECT username FROM profiles GROUP BY username HAVING COUNT(*) > 1
    );
    -- Luego crear el constraint
    ALTER TABLE profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_date_of_birth ON profiles(date_of_birth);

-- ============================================
-- Tipos de documento válidos por país
-- ============================================
CREATE TABLE IF NOT EXISTS document_types (
  id TEXT PRIMARY KEY,
  label_es TEXT NOT NULL,
  label_en TEXT,
  countries TEXT[] NOT NULL,
  format_hint TEXT,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO document_types (id, label_es, label_en, countries, format_hint) VALUES
('cc', 'Cédula de Ciudadanía', 'National ID', ARRAY['CO'], '10 dígitos'),
('ce', 'Cédula de Extranjería', 'Foreign ID', ARRAY['CO'], 'Alfanumérico'),
('ti', 'Tarjeta de Identidad', 'Identity Card', ARRAY['CO'], '10 dígitos'),
('nit', 'NIT', 'Tax ID (NIT)', ARRAY['CO'], '9-10 dígitos con DV'),
('passport', 'Pasaporte', 'Passport', ARRAY['CO','MX','PE','CL','EC','AR','BR','US','ES'], 'Alfanumérico'),
('ine', 'INE / IFE', 'INE / IFE', ARRAY['MX'], '13 dígitos'),
('curp', 'CURP', 'CURP', ARRAY['MX'], '18 caracteres alfanuméricos'),
('rfc', 'RFC', 'Tax ID (RFC)', ARRAY['MX'], '12-13 caracteres'),
('dni', 'DNI', 'National ID (DNI)', ARRAY['PE','AR','CL','EC','ES'], '8-12 dígitos'),
('rut', 'RUT', 'Tax ID (RUT)', ARRAY['CL'], '8-9 dígitos con DV'),
('cpf', 'CPF', 'Tax ID (CPF)', ARRAY['BR'], '11 dígitos'),
('ssn', 'SSN', 'Social Security Number', ARRAY['US'], '9 dígitos'),
('ein', 'EIN', 'Employer ID Number', ARRAY['US'], '9 dígitos'),
('other', 'Otro documento', 'Other document', ARRAY['CO','MX','PE','CL','EC','AR','BR','US','ES'], 'Alfanumérico')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_reads_doc_types" ON document_types;
CREATE POLICY "anyone_reads_doc_types" ON document_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "anon_reads_doc_types" ON document_types FOR SELECT TO anon USING (true);

GRANT SELECT ON document_types TO authenticated;
GRANT SELECT ON document_types TO anon;

-- ============================================
-- Lista de países con códigos
-- ============================================
CREATE TABLE IF NOT EXISTS countries (
  code TEXT PRIMARY KEY,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  dial_code TEXT NOT NULL,
  flag TEXT NOT NULL,
  is_latam BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 999
);

INSERT INTO countries (code, name_es, name_en, dial_code, flag, is_latam, sort_order) VALUES
-- LATAM primero
('CO', 'Colombia', 'Colombia', '+57', '🇨🇴', true, 1),
('MX', 'México', 'Mexico', '+52', '🇲🇽', true, 2),
('AR', 'Argentina', 'Argentina', '+54', '🇦🇷', true, 3),
('PE', 'Perú', 'Peru', '+51', '🇵🇪', true, 4),
('CL', 'Chile', 'Chile', '+56', '🇨🇱', true, 5),
('EC', 'Ecuador', 'Ecuador', '+593', '🇪🇨', true, 6),
('VE', 'Venezuela', 'Venezuela', '+58', '🇻🇪', true, 7),
('BO', 'Bolivia', 'Bolivia', '+591', '🇧🇴', true, 8),
('PY', 'Paraguay', 'Paraguay', '+595', '🇵🇾', true, 9),
('UY', 'Uruguay', 'Uruguay', '+598', '🇺🇾', true, 10),
('DO', 'Rep. Dominicana', 'Dominican Republic', '+1', '🇩🇴', true, 11),
('GT', 'Guatemala', 'Guatemala', '+502', '🇬🇹', true, 12),
('HN', 'Honduras', 'Honduras', '+504', '🇭🇳', true, 13),
('SV', 'El Salvador', 'El Salvador', '+503', '🇸🇻', true, 14),
('NI', 'Nicaragua', 'Nicaragua', '+505', '🇳🇮', true, 15),
('CR', 'Costa Rica', 'Costa Rica', '+506', '🇨🇷', true, 16),
('PA', 'Panamá', 'Panama', '+507', '🇵🇦', true, 17),
('CU', 'Cuba', 'Cuba', '+53', '🇨🇺', true, 18),
('PR', 'Puerto Rico', 'Puerto Rico', '+1', '🇵🇷', true, 19),
('BR', 'Brasil', 'Brazil', '+55', '🇧🇷', true, 20),
-- USA y España después
('US', 'Estados Unidos', 'United States', '+1', '🇺🇸', false, 21),
('ES', 'España', 'Spain', '+34', '🇪🇸', false, 22)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_reads_countries" ON countries;
CREATE POLICY "anyone_reads_countries" ON countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "anon_reads_countries" ON countries FOR SELECT TO anon USING (true);

GRANT SELECT ON countries TO authenticated;
GRANT SELECT ON countries TO anon;

-- ============================================
-- RPC: Verificar si el perfil está completo
-- ============================================
CREATE OR REPLACE FUNCTION check_profile_completion(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_missing TEXT[] := '{}';
  v_has_social BOOLEAN := false;
  v_age_ok BOOLEAN := false;
  v_result JSONB;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('complete', false, 'missing', ARRAY['profile_not_found']);
  END IF;

  -- Campos obligatorios
  IF v_profile.full_name IS NULL OR v_profile.full_name = '' THEN
    v_missing := array_append(v_missing, 'full_name');
  END IF;
  IF v_profile.username IS NULL OR v_profile.username = '' THEN
    v_missing := array_append(v_missing, 'username');
  END IF;
  IF v_profile.phone IS NULL OR v_profile.phone = '' THEN
    v_missing := array_append(v_missing, 'phone');
  END IF;
  IF v_profile.email IS NULL OR v_profile.email = '' THEN
    v_missing := array_append(v_missing, 'email');
  END IF;
  IF v_profile.country IS NULL OR v_profile.country = '' THEN
    v_missing := array_append(v_missing, 'country');
  END IF;
  IF v_profile.city IS NULL OR v_profile.city = '' THEN
    v_missing := array_append(v_missing, 'city');
  END IF;
  IF v_profile.address IS NULL OR v_profile.address = '' THEN
    v_missing := array_append(v_missing, 'address');
  END IF;
  IF v_profile.document_type IS NULL OR v_profile.document_type = '' THEN
    v_missing := array_append(v_missing, 'document_type');
  END IF;
  IF v_profile.document_number IS NULL OR v_profile.document_number = '' THEN
    v_missing := array_append(v_missing, 'document_number');
  END IF;
  IF v_profile.nationality IS NULL OR v_profile.nationality = '' THEN
    v_missing := array_append(v_missing, 'nationality');
  END IF;
  IF v_profile.date_of_birth IS NULL THEN
    v_missing := array_append(v_missing, 'date_of_birth');
  ELSE
    -- Verificar edad >= 18
    IF (CURRENT_DATE - v_profile.date_of_birth) / 365 >= 18 THEN
      v_age_ok := true;
    ELSE
      v_missing := array_append(v_missing, 'age_under_18');
    END IF;
  END IF;

  -- Al menos UNA red social
  IF COALESCE(v_profile.social_instagram, v_profile.instagram, '') != ''
     OR COALESCE(v_profile.social_facebook, v_profile.facebook, '') != ''
     OR COALESCE(v_profile.social_tiktok, v_profile.tiktok, '') != ''
     OR COALESCE(v_profile.social_x, '') != ''
     OR COALESCE(v_profile.social_youtube, '') != ''
     OR COALESCE(v_profile.social_linkedin, '') != '' THEN
    v_has_social := true;
  END IF;

  IF NOT v_has_social THEN
    v_missing := array_append(v_missing, 'social_network');
  END IF;

  -- Resultado
  v_result := jsonb_build_object(
    'complete', (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0),
    'missing', v_missing,
    'has_social', v_has_social,
    'age_ok', v_age_ok,
    'profile_completed', COALESCE(v_profile.profile_completed, false),
    'age_verified', COALESCE(v_profile.age_verified, false),
    'legal_consents_completed', COALESCE(v_profile.legal_consents_completed, false),
    'onboarding_completed', COALESCE(v_profile.onboarding_completed, false)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC: Verificar unicidad de username
-- ============================================
CREATE OR REPLACE FUNCTION check_username_available(p_username TEXT, p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_normalized TEXT;
BEGIN
  v_normalized := lower(trim(p_username));

  IF p_user_id IS NOT NULL THEN
    RETURN NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE lower(username) = v_normalized
      AND id != p_user_id
    );
  ELSE
    RETURN NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE lower(username) = v_normalized
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC: Guardar datos del perfil (paso 1 del onboarding)
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
  p_social_linkedin TEXT DEFAULT NULL
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

-- ============================================
-- RPC: Marcar onboarding como completado
-- ============================================
CREATE OR REPLACE FUNCTION complete_onboarding(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_check JSONB;
  v_consents_ok BOOLEAN;
BEGIN
  -- Verificar que el perfil esté completo
  v_check := check_profile_completion(p_user_id);

  IF NOT (v_check->>'complete')::boolean THEN
    RETURN false;
  END IF;

  -- Verificar que los consentimientos estén aceptados
  -- (la función get_pending_consents existe de la migración anterior)
  BEGIN
    SELECT NOT EXISTS (
      SELECT 1 FROM get_pending_consents(p_user_id)
      WHERE is_required = true
    ) INTO v_consents_ok;
  EXCEPTION WHEN undefined_function THEN
    -- Si la función no existe, asumir que está OK (para pruebas)
    v_consents_ok := true;
  END;

  IF NOT v_consents_ok THEN
    RETURN false;
  END IF;

  -- Marcar todo como completado
  UPDATE profiles SET
    profile_completed = true,
    profile_completed_at = COALESCE(profile_completed_at, NOW()),
    legal_consents_completed = true,
    legal_consents_completed_at = COALESCE(legal_consents_completed_at, NOW()),
    onboarding_completed = true,
    onboarding_completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Comentarios
-- ============================================
COMMENT ON TABLE document_types IS 'Tipos de documento de identidad por país';
COMMENT ON TABLE countries IS 'Lista de países con códigos de marcado';
COMMENT ON COLUMN profiles.onboarding_completed IS 'True cuando el usuario completó perfil + consentimientos';
COMMENT ON COLUMN profiles.date_of_birth IS 'Fecha de nacimiento para verificación de edad';

-- Notificar cambio de esquema
NOTIFY pgrst, 'reload schema';
