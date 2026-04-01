-- =====================================================
-- Profile Builder: Sistema de bloques personalizables
-- =====================================================

-- 1. Tabla principal de bloques del perfil
CREATE TABLE IF NOT EXISTS profile_builder_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  block_type text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  is_visible boolean DEFAULT true,
  is_draft boolean DEFAULT false,
  config jsonb DEFAULT '{}',
  styles jsonb DEFAULT '{}',
  content jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_profile_builder_blocks_profile
  ON profile_builder_blocks(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_builder_blocks_order
  ON profile_builder_blocks(profile_id, order_index);
CREATE INDEX IF NOT EXISTS idx_profile_builder_blocks_draft
  ON profile_builder_blocks(profile_id, is_draft);

-- 2. Tabla para tokens de preview temporal
CREATE TABLE IF NOT EXISTS profile_preview_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preview_tokens_token
  ON profile_preview_tokens(token);
CREATE INDEX IF NOT EXISTS idx_preview_tokens_expires
  ON profile_preview_tokens(expires_at);

-- 3. Nuevas columnas en creator_profiles
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS builder_config jsonb DEFAULT '{
  "theme": "dark",
  "accentColor": "#8B5CF6",
  "fontHeading": "inter",
  "fontBody": "inter",
  "spacing": "normal",
  "borderRadius": "md",
  "showKreoonBranding": true
}'::jsonb;

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS builder_template text DEFAULT NULL;

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS builder_has_draft boolean DEFAULT false;

-- 4. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_profile_builder_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profile_builder_blocks_updated_at ON profile_builder_blocks;
CREATE TRIGGER trg_profile_builder_blocks_updated_at
  BEFORE UPDATE ON profile_builder_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_builder_blocks_updated_at();

-- 5. RLS Policies
ALTER TABLE profile_builder_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_preview_tokens ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver sus propios bloques
CREATE POLICY "Users can view own profile blocks"
  ON profile_builder_blocks FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Política: Usuarios pueden insertar bloques en su perfil
CREATE POLICY "Users can insert own profile blocks"
  ON profile_builder_blocks FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Política: Usuarios pueden actualizar sus propios bloques
CREATE POLICY "Users can update own profile blocks"
  ON profile_builder_blocks FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Política: Usuarios pueden eliminar sus propios bloques
CREATE POLICY "Users can delete own profile blocks"
  ON profile_builder_blocks FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Política: Cualquiera puede ver bloques publicados (no draft)
CREATE POLICY "Anyone can view published blocks"
  ON profile_builder_blocks FOR SELECT
  USING (is_draft = false);

-- Políticas para preview tokens
CREATE POLICY "Users can manage own preview tokens"
  ON profile_preview_tokens FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- 6. Función para limpiar tokens expirados
CREATE OR REPLACE FUNCTION cleanup_expired_preview_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM profile_preview_tokens WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Función para obtener datos del builder
CREATE OR REPLACE FUNCTION get_profile_builder_data(profile_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'profile', (
      SELECT jsonb_build_object(
        'id', cp.id,
        'user_id', cp.user_id,
        'display_name', cp.display_name,
        'bio', cp.bio,
        'avatar_url', cp.avatar_url,
        'cover_url', cp.cover_url,
        'builder_config', COALESCE(cp.builder_config, '{}'::jsonb),
        'builder_template', cp.builder_template,
        'builder_has_draft', COALESCE(cp.builder_has_draft, false)
      )
      FROM creator_profiles cp
      WHERE cp.id = profile_uuid
    ),
    'blocks', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'type', b.block_type,
          'orderIndex', b.order_index,
          'isVisible', b.is_visible,
          'isDraft', b.is_draft,
          'config', b.config,
          'styles', b.styles,
          'content', b.content
        ) ORDER BY b.order_index
      )
      FROM profile_builder_blocks b
      WHERE b.profile_id = profile_uuid),
      '[]'::jsonb
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- 8. Función para guardar bloques (batch)
CREATE OR REPLACE FUNCTION save_profile_blocks(
  profile_uuid uuid,
  blocks_data jsonb,
  save_as_draft boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el usuario es dueño del perfil
  IF NOT EXISTS (
    SELECT 1 FROM creator_profiles
    WHERE id = profile_uuid AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Validar límite de 15 bloques
  IF jsonb_array_length(blocks_data) > 15 THEN
    RAISE EXCEPTION 'Máximo 15 bloques permitidos';
  END IF;

  -- Eliminar bloques existentes (del tipo correspondiente: draft o published)
  IF save_as_draft THEN
    DELETE FROM profile_builder_blocks
    WHERE profile_id = profile_uuid AND is_draft = true;
  ELSE
    DELETE FROM profile_builder_blocks
    WHERE profile_id = profile_uuid;
  END IF;

  -- Insertar nuevos bloques
  INSERT INTO profile_builder_blocks (
    profile_id, block_type, order_index, is_visible, is_draft, config, styles, content
  )
  SELECT
    profile_uuid,
    b->>'type',
    (b->>'orderIndex')::int,
    COALESCE((b->>'isVisible')::boolean, true),
    save_as_draft,
    COALESCE(b->'config', '{}'::jsonb),
    COALESCE(b->'styles', '{}'::jsonb),
    COALESCE(b->'content', '{}'::jsonb)
  FROM jsonb_array_elements(blocks_data) b;

  -- Actualizar flag de draft en el perfil
  UPDATE creator_profiles
  SET builder_has_draft = save_as_draft
  WHERE id = profile_uuid;

  RETURN true;
END;
$$;

-- 9. Función para publicar cambios (convertir draft a published)
CREATE OR REPLACE FUNCTION publish_profile_blocks(profile_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar propiedad
  IF NOT EXISTS (
    SELECT 1 FROM creator_profiles
    WHERE id = profile_uuid AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Eliminar bloques publicados anteriores
  DELETE FROM profile_builder_blocks
  WHERE profile_id = profile_uuid AND is_draft = false;

  -- Convertir drafts a publicados
  UPDATE profile_builder_blocks
  SET is_draft = false
  WHERE profile_id = profile_uuid AND is_draft = true;

  -- Limpiar flag
  UPDATE creator_profiles
  SET builder_has_draft = false
  WHERE id = profile_uuid;

  RETURN true;
END;
$$;

-- 10. Función para generar token de preview
CREATE OR REPLACE FUNCTION generate_preview_token(profile_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_token text;
BEGIN
  -- Verificar propiedad
  IF NOT EXISTS (
    SELECT 1 FROM creator_profiles
    WHERE id = profile_uuid AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Generar token único
  new_token := encode(gen_random_bytes(32), 'hex');

  -- Limpiar tokens anteriores del mismo perfil
  DELETE FROM profile_preview_tokens WHERE profile_id = profile_uuid;

  -- Insertar nuevo token
  INSERT INTO profile_preview_tokens (profile_id, token)
  VALUES (profile_uuid, new_token);

  RETURN new_token;
END;
$$;

-- 11. Función para validar token de preview
CREATE OR REPLACE FUNCTION validate_preview_token(preview_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  found_profile_id uuid;
BEGIN
  SELECT profile_id INTO found_profile_id
  FROM profile_preview_tokens
  WHERE token = preview_token AND expires_at > now();

  RETURN found_profile_id;
END;
$$;

-- 12. Función para inicializar bloques default
CREATE OR REPLACE FUNCTION initialize_default_blocks(profile_uuid uuid, template_name text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_blocks jsonb;
BEGIN
  -- Bloques default básicos
  default_blocks := '[
    {"type": "hero_banner", "orderIndex": 0, "isVisible": true, "config": {}, "styles": {}, "content": {}},
    {"type": "about", "orderIndex": 1, "isVisible": true, "config": {}, "styles": {}, "content": {}},
    {"type": "portfolio", "orderIndex": 2, "isVisible": true, "config": {"layout": "grid"}, "styles": {}, "content": {}},
    {"type": "services", "orderIndex": 3, "isVisible": true, "config": {}, "styles": {}, "content": {}},
    {"type": "stats", "orderIndex": 4, "isVisible": true, "config": {}, "styles": {}, "content": {}},
    {"type": "reviews", "orderIndex": 5, "isVisible": true, "config": {}, "styles": {}, "content": {}},
    {"type": "contact", "orderIndex": 6, "isVisible": true, "config": {}, "styles": {}, "content": {}}
  ]'::jsonb;

  -- Guardar template usado
  IF template_name IS NOT NULL THEN
    UPDATE creator_profiles
    SET builder_template = template_name
    WHERE id = profile_uuid;
  END IF;

  -- Insertar bloques
  INSERT INTO profile_builder_blocks (
    profile_id, block_type, order_index, is_visible, config, styles, content
  )
  SELECT
    profile_uuid,
    b->>'type',
    (b->>'orderIndex')::int,
    true,
    COALESCE(b->'config', '{}'::jsonb),
    '{}'::jsonb,
    '{}'::jsonb
  FROM jsonb_array_elements(default_blocks) b
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;
