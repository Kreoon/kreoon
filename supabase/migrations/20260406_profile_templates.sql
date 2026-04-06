-- =====================================================
-- Profile Templates: Biblioteca publica de plantillas
-- =====================================================
-- Permite a usuarios guardar, compartir y explorar
-- plantillas de perfil del Profile Builder
-- =====================================================

-- 1. Tabla principal de plantillas
CREATE TABLE IF NOT EXISTS profile_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Autor y referencia
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_profile_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,

  -- Metadatos
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  tags text[] DEFAULT '{}',

  -- Contenido de la plantilla (snapshot completo)
  builder_config jsonb NOT NULL DEFAULT '{}',
  blocks jsonb NOT NULL DEFAULT '[]',

  -- Preview
  thumbnail_url text,
  preview_colors jsonb DEFAULT '{}',

  -- Visibilidad y moderacion
  visibility text NOT NULL DEFAULT 'draft',
  moderation_status text DEFAULT 'approved',
  moderation_note text,
  moderated_at timestamptz,
  moderated_by uuid REFERENCES auth.users(id),

  -- Metricas de engagement
  use_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  save_count integer DEFAULT 0,

  -- Restricciones de uso
  min_tier_required text DEFAULT 'creator_free',
  is_official boolean DEFAULT false,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz,

  -- Constraints
  CONSTRAINT valid_visibility CHECK (visibility IN ('draft', 'unlisted', 'public', 'featured')),
  CONSTRAINT valid_moderation CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT valid_category CHECK (category IN ('ugc', 'freelancer', 'agency', 'influencer', 'portfolio', 'services', 'general'))
);

-- Indices para busqueda y exploracion
CREATE INDEX IF NOT EXISTS idx_templates_visibility
  ON profile_templates(visibility) WHERE visibility IN ('public', 'featured');
CREATE INDEX IF NOT EXISTS idx_templates_category
  ON profile_templates(category) WHERE visibility IN ('public', 'featured');
CREATE INDEX IF NOT EXISTS idx_templates_author
  ON profile_templates(author_id);
CREATE INDEX IF NOT EXISTS idx_templates_popularity
  ON profile_templates(use_count DESC, like_count DESC) WHERE visibility IN ('public', 'featured');
CREATE INDEX IF NOT EXISTS idx_templates_tags
  ON profile_templates USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_templates_slug
  ON profile_templates(slug);
CREATE INDEX IF NOT EXISTS idx_templates_moderation
  ON profile_templates(moderation_status) WHERE visibility = 'public';

-- 2. Tabla de interacciones
CREATE TABLE IF NOT EXISTS profile_template_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES profile_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type text NOT NULL,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT valid_interaction_type CHECK (interaction_type IN ('view', 'use', 'like', 'save'))
);

-- Indice unico para evitar duplicados de like/save
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_interactions_unique
  ON profile_template_interactions(template_id, user_id, interaction_type)
  WHERE interaction_type IN ('like', 'save');

CREATE INDEX IF NOT EXISTS idx_template_interactions_template
  ON profile_template_interactions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_interactions_user
  ON profile_template_interactions(user_id);

-- 3. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_profile_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profile_templates_updated_at ON profile_templates;
CREATE TRIGGER trg_profile_templates_updated_at
  BEFORE UPDATE ON profile_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_templates_updated_at();

-- 4. Trigger para actualizar contadores de engagement
CREATE OR REPLACE FUNCTION update_template_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profile_templates SET
      view_count = view_count + CASE WHEN NEW.interaction_type = 'view' THEN 1 ELSE 0 END,
      use_count = use_count + CASE WHEN NEW.interaction_type = 'use' THEN 1 ELSE 0 END,
      like_count = like_count + CASE WHEN NEW.interaction_type = 'like' THEN 1 ELSE 0 END,
      save_count = save_count + CASE WHEN NEW.interaction_type = 'save' THEN 1 ELSE 0 END
    WHERE id = NEW.template_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profile_templates SET
      like_count = like_count - CASE WHEN OLD.interaction_type = 'like' THEN 1 ELSE 0 END,
      save_count = save_count - CASE WHEN OLD.interaction_type = 'save' THEN 1 ELSE 0 END
    WHERE id = OLD.template_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_template_interaction_counters ON profile_template_interactions;
CREATE TRIGGER trg_template_interaction_counters
  AFTER INSERT OR DELETE ON profile_template_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_template_counters();

-- 5. RLS Policies
ALTER TABLE profile_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_template_interactions ENABLE ROW LEVEL SECURITY;

-- Plantillas: Lectura publica para templates aprobados y publicos
DROP POLICY IF EXISTS "Anyone can view public approved templates" ON profile_templates;
CREATE POLICY "Anyone can view public approved templates"
  ON profile_templates FOR SELECT
  TO anon, authenticated
  USING (
    visibility IN ('public', 'featured')
    AND moderation_status = 'approved'
  );

-- Plantillas: Propietario puede ver todas sus plantillas
DROP POLICY IF EXISTS "Users can view own templates" ON profile_templates;
CREATE POLICY "Users can view own templates"
  ON profile_templates FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());

-- Plantillas: Acceso por link (unlisted)
DROP POLICY IF EXISTS "Anyone can view unlisted templates" ON profile_templates;
CREATE POLICY "Anyone can view unlisted templates"
  ON profile_templates FOR SELECT
  TO anon, authenticated
  USING (visibility = 'unlisted');

-- Plantillas: Solo el autor puede crear
DROP POLICY IF EXISTS "Users can insert own templates" ON profile_templates;
CREATE POLICY "Users can insert own templates"
  ON profile_templates FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Plantillas: Solo el autor puede actualizar
DROP POLICY IF EXISTS "Users can update own templates" ON profile_templates;
CREATE POLICY "Users can update own templates"
  ON profile_templates FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

-- Plantillas: Solo el autor puede eliminar
DROP POLICY IF EXISTS "Users can delete own templates" ON profile_templates;
CREATE POLICY "Users can delete own templates"
  ON profile_templates FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- Interacciones: Los usuarios pueden gestionar sus propias interacciones
DROP POLICY IF EXISTS "Users can manage own interactions" ON profile_template_interactions;
CREATE POLICY "Users can manage own interactions"
  ON profile_template_interactions FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Interacciones: Lectura publica (para contar)
DROP POLICY IF EXISTS "Anyone can read interactions" ON profile_template_interactions;
CREATE POLICY "Anyone can read interactions"
  ON profile_template_interactions FOR SELECT
  TO anon, authenticated
  USING (true);

-- =====================================================
-- FUNCIONES RPC
-- =====================================================

-- 6. Guardar perfil como plantilla
CREATE OR REPLACE FUNCTION save_profile_as_template(
  p_name text,
  p_description text DEFAULT NULL,
  p_category text DEFAULT 'general',
  p_tags text[] DEFAULT '{}',
  p_visibility text DEFAULT 'draft'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_profile_id uuid;
  v_builder_config jsonb;
  v_blocks jsonb;
  v_template_id uuid;
  v_slug text;
  v_accent_color text;
  v_theme text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Obtener perfil del creador con config
  SELECT
    cp.id,
    COALESCE(cp.builder_config, '{}'::jsonb),
    COALESCE(cp.builder_config->>'accentColor', '#8B5CF6'),
    COALESCE(cp.builder_config->>'theme', 'dark')
  INTO v_profile_id, v_builder_config, v_accent_color, v_theme
  FROM creator_profiles cp
  WHERE cp.user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No creator profile found';
  END IF;

  -- Obtener bloques publicados (no draft)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'type', block_type,
      'orderIndex', order_index,
      'isVisible', is_visible,
      'config', config,
      'styles', styles,
      'content', content
    ) ORDER BY order_index
  ), '[]'::jsonb)
  INTO v_blocks
  FROM profile_builder_blocks
  WHERE profile_id = v_profile_id AND is_draft = false;

  IF v_blocks = '[]'::jsonb THEN
    RAISE EXCEPTION 'No published blocks found. Publish your profile first.';
  END IF;

  -- Generar slug unico
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Insertar plantilla
  INSERT INTO profile_templates (
    author_id, author_profile_id, name, slug, description,
    category, tags, builder_config, blocks, visibility,
    preview_colors, moderation_status, published_at
  ) VALUES (
    v_user_id, v_profile_id, p_name, v_slug, p_description,
    p_category, p_tags, v_builder_config, v_blocks, p_visibility,
    jsonb_build_object('accentColor', v_accent_color, 'theme', v_theme),
    CASE WHEN p_visibility = 'public' THEN 'pending' ELSE 'approved' END,
    CASE WHEN p_visibility IN ('public', 'unlisted') THEN now() ELSE NULL END
  )
  RETURNING id INTO v_template_id;

  RETURN v_template_id;
END;
$$;

-- 7. Clonar plantilla al perfil
CREATE OR REPLACE FUNCTION clone_template_to_profile(
  p_template_id uuid,
  p_clone_content boolean DEFAULT false,
  p_merge_mode text DEFAULT 'replace'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_profile_id uuid;
  v_user_tier text;
  v_template record;
  v_block jsonb;
  v_order_offset int DEFAULT 0;
  v_cleaned_content jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Obtener perfil del usuario con tier
  SELECT cp.id, COALESCE(cp.subscription_tier, 'creator_free')
  INTO v_profile_id, v_user_tier
  FROM creator_profiles cp
  WHERE cp.user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No creator profile found';
  END IF;

  -- Obtener plantilla (verificar acceso)
  SELECT * INTO v_template
  FROM profile_templates pt
  WHERE pt.id = p_template_id
    AND (
      pt.visibility IN ('public', 'featured', 'unlisted')
      OR pt.author_id = v_user_id
    )
    AND (pt.moderation_status = 'approved' OR pt.author_id = v_user_id);

  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Template not found or not accessible';
  END IF;

  -- Verificar tier requerido
  IF v_template.min_tier_required = 'creator_premium' AND v_user_tier NOT IN ('creator_premium') THEN
    RAISE EXCEPTION 'Premium tier required for this template';
  END IF;
  IF v_template.min_tier_required = 'creator_pro' AND v_user_tier = 'creator_free' THEN
    RAISE EXCEPTION 'Pro tier required for this template';
  END IF;

  -- Modo replace: eliminar bloques existentes
  IF p_merge_mode = 'replace' THEN
    DELETE FROM profile_builder_blocks WHERE profile_builder_blocks.profile_id = v_profile_id;
    v_order_offset := 0;
  ELSE
    -- Modo merge: obtener siguiente order_index
    SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_order_offset
    FROM profile_builder_blocks WHERE profile_builder_blocks.profile_id = v_profile_id;
  END IF;

  -- Insertar bloques de la plantilla
  FOR v_block IN SELECT * FROM jsonb_array_elements(v_template.blocks)
  LOOP
    -- Limpiar contenido si no se clona
    IF p_clone_content THEN
      v_cleaned_content := COALESCE(v_block->'content', '{}'::jsonb);
    ELSE
      v_cleaned_content := '{}'::jsonb;
    END IF;

    INSERT INTO profile_builder_blocks (
      profile_id, block_type, order_index, is_visible, is_draft, config, styles, content
    ) VALUES (
      v_profile_id,
      v_block->>'type',
      (v_block->>'orderIndex')::int + v_order_offset,
      COALESCE((v_block->>'isVisible')::boolean, true),
      false,
      COALESCE(v_block->'config', '{}'::jsonb),
      COALESCE(v_block->'styles', '{}'::jsonb),
      v_cleaned_content
    );
  END LOOP;

  -- Aplicar builder_config
  UPDATE creator_profiles
  SET
    builder_config = v_template.builder_config,
    builder_template = v_template.name
  WHERE id = v_profile_id;

  -- Registrar uso (solo si no es el autor)
  IF v_template.author_id != v_user_id THEN
    INSERT INTO profile_template_interactions (template_id, user_id, interaction_type)
    VALUES (p_template_id, v_user_id, 'use')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN true;
END;
$$;

-- 8. Obtener plantillas publicas con paginacion
CREATE OR REPLACE FUNCTION get_public_templates(
  p_category text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_sort_by text DEFAULT 'popular',
  p_page int DEFAULT 0,
  p_page_size int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_templates jsonb;
  v_total int;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- Contar total
  SELECT COUNT(*) INTO v_total
  FROM profile_templates pt
  WHERE pt.visibility IN ('public', 'featured')
    AND pt.moderation_status = 'approved'
    AND (p_category IS NULL OR pt.category = p_category)
    AND (p_search IS NULL OR p_search = '' OR
         pt.name ILIKE '%' || p_search || '%' OR
         pt.description ILIKE '%' || p_search || '%' OR
         p_search = ANY(pt.tags));

  -- Obtener plantillas
  WITH ranked AS (
    SELECT
      pt.id,
      pt.name,
      pt.slug,
      pt.description,
      pt.category,
      pt.tags,
      pt.thumbnail_url,
      pt.preview_colors,
      pt.use_count,
      pt.like_count,
      pt.view_count,
      pt.save_count,
      pt.visibility,
      pt.min_tier_required,
      pt.is_official,
      pt.created_at,
      pt.published_at,
      jsonb_build_object(
        'id', cp.id,
        'display_name', cp.display_name,
        'avatar_url', cp.avatar_url,
        'subscription_tier', cp.subscription_tier
      ) as author,
      CASE WHEN v_user_id IS NOT NULL THEN
        EXISTS(SELECT 1 FROM profile_template_interactions
               WHERE template_id = pt.id AND user_id = v_user_id AND interaction_type = 'like')
      ELSE false END as user_liked,
      CASE WHEN v_user_id IS NOT NULL THEN
        EXISTS(SELECT 1 FROM profile_template_interactions
               WHERE template_id = pt.id AND user_id = v_user_id AND interaction_type = 'save')
      ELSE false END as user_saved,
      -- Ranking score
      CASE p_sort_by
        WHEN 'popular' THEN pt.use_count * 2 + pt.like_count + pt.view_count * 0.1
        WHEN 'most_used' THEN pt.use_count
        WHEN 'newest' THEN EXTRACT(EPOCH FROM pt.published_at)
        ELSE pt.use_count
      END as rank_score
    FROM profile_templates pt
    JOIN creator_profiles cp ON cp.id = pt.author_profile_id
    WHERE pt.visibility IN ('public', 'featured')
      AND pt.moderation_status = 'approved'
      AND (p_category IS NULL OR pt.category = p_category)
      AND (p_search IS NULL OR p_search = '' OR
           pt.name ILIKE '%' || p_search || '%' OR
           pt.description ILIKE '%' || p_search || '%' OR
           p_search = ANY(pt.tags))
    ORDER BY
      pt.visibility = 'featured' DESC,
      rank_score DESC NULLS LAST
    OFFSET p_page * p_page_size
    LIMIT p_page_size
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'slug', r.slug,
      'description', r.description,
      'category', r.category,
      'tags', r.tags,
      'thumbnail_url', r.thumbnail_url,
      'preview_colors', r.preview_colors,
      'use_count', r.use_count,
      'like_count', r.like_count,
      'view_count', r.view_count,
      'save_count', r.save_count,
      'visibility', r.visibility,
      'min_tier_required', r.min_tier_required,
      'is_official', r.is_official,
      'created_at', r.created_at,
      'published_at', r.published_at,
      'author', r.author,
      'user_liked', r.user_liked,
      'user_saved', r.user_saved
    )
  ), '[]'::jsonb) INTO v_templates
  FROM ranked r;

  RETURN jsonb_build_object(
    'templates', v_templates,
    'total', v_total,
    'page', p_page,
    'pageSize', p_page_size,
    'hasMore', (p_page + 1) * p_page_size < v_total
  );
END;
$$;

-- 9. Obtener plantilla por slug (para preview)
CREATE OR REPLACE FUNCTION get_template_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_template jsonb;
  v_user_id uuid;
  v_template_id uuid;
  v_is_owner boolean;
BEGIN
  v_user_id := auth.uid();

  SELECT
    pt.id,
    pt.author_id = v_user_id
  INTO v_template_id, v_is_owner
  FROM profile_templates pt
  WHERE pt.slug = p_slug;

  IF v_template_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', pt.id,
    'name', pt.name,
    'slug', pt.slug,
    'description', pt.description,
    'category', pt.category,
    'tags', pt.tags,
    'thumbnail_url', pt.thumbnail_url,
    'builder_config', pt.builder_config,
    'blocks', pt.blocks,
    'preview_colors', pt.preview_colors,
    'use_count', pt.use_count,
    'like_count', pt.like_count,
    'view_count', pt.view_count,
    'save_count', pt.save_count,
    'visibility', pt.visibility,
    'moderation_status', pt.moderation_status,
    'min_tier_required', pt.min_tier_required,
    'is_official', pt.is_official,
    'created_at', pt.created_at,
    'published_at', pt.published_at,
    'author', jsonb_build_object(
      'id', cp.id,
      'user_id', cp.user_id,
      'display_name', cp.display_name,
      'avatar_url', cp.avatar_url,
      'subscription_tier', cp.subscription_tier
    ),
    'user_liked', CASE WHEN v_user_id IS NOT NULL THEN
      EXISTS(SELECT 1 FROM profile_template_interactions
             WHERE template_id = pt.id AND user_id = v_user_id AND interaction_type = 'like')
      ELSE false END,
    'user_saved', CASE WHEN v_user_id IS NOT NULL THEN
      EXISTS(SELECT 1 FROM profile_template_interactions
             WHERE template_id = pt.id AND user_id = v_user_id AND interaction_type = 'save')
      ELSE false END,
    'is_owner', pt.author_id = v_user_id
  )
  INTO v_template
  FROM profile_templates pt
  JOIN creator_profiles cp ON cp.id = pt.author_profile_id
  WHERE pt.slug = p_slug
    AND (
      pt.visibility IN ('public', 'featured', 'unlisted')
      OR pt.author_id = v_user_id
    )
    AND (pt.moderation_status = 'approved' OR pt.author_id = v_user_id);

  -- Registrar view si no es el autor y esta autenticado
  IF v_template IS NOT NULL AND v_user_id IS NOT NULL AND NOT v_is_owner THEN
    INSERT INTO profile_template_interactions (template_id, user_id, interaction_type)
    VALUES (v_template_id, v_user_id, 'view')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_template;
END;
$$;

-- 10. Obtener plantillas del usuario actual
CREATE OR REPLACE FUNCTION get_my_templates()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_templates jsonb;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', pt.id,
      'name', pt.name,
      'slug', pt.slug,
      'description', pt.description,
      'category', pt.category,
      'tags', pt.tags,
      'thumbnail_url', pt.thumbnail_url,
      'preview_colors', pt.preview_colors,
      'use_count', pt.use_count,
      'like_count', pt.like_count,
      'view_count', pt.view_count,
      'visibility', pt.visibility,
      'moderation_status', pt.moderation_status,
      'created_at', pt.created_at,
      'published_at', pt.published_at
    ) ORDER BY pt.created_at DESC
  ), '[]'::jsonb) INTO v_templates
  FROM profile_templates pt
  WHERE pt.author_id = v_user_id;

  RETURN v_templates;
END;
$$;

-- 11. Toggle like/save en plantilla
CREATE OR REPLACE FUNCTION toggle_template_interaction(
  p_template_id uuid,
  p_interaction_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_exists boolean;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_interaction_type NOT IN ('like', 'save') THEN
    RAISE EXCEPTION 'Invalid interaction type';
  END IF;

  -- Verificar si ya existe
  SELECT EXISTS(
    SELECT 1 FROM profile_template_interactions
    WHERE template_id = p_template_id
      AND user_id = v_user_id
      AND interaction_type = p_interaction_type
  ) INTO v_exists;

  IF v_exists THEN
    -- Eliminar (toggle off)
    DELETE FROM profile_template_interactions
    WHERE template_id = p_template_id
      AND user_id = v_user_id
      AND interaction_type = p_interaction_type;
    RETURN false;
  ELSE
    -- Insertar (toggle on)
    INSERT INTO profile_template_interactions (template_id, user_id, interaction_type)
    VALUES (p_template_id, v_user_id, p_interaction_type);
    RETURN true;
  END IF;
END;
$$;

-- 12. Actualizar plantilla (solo metadata, no bloques)
CREATE OR REPLACE FUNCTION update_template_metadata(
  p_template_id uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_visibility text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE profile_templates
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    category = COALESCE(p_category, category),
    tags = COALESCE(p_tags, tags),
    visibility = COALESCE(p_visibility, visibility),
    moderation_status = CASE
      WHEN p_visibility = 'public' AND visibility != 'public' THEN 'pending'
      ELSE moderation_status
    END,
    published_at = CASE
      WHEN p_visibility IN ('public', 'unlisted') AND published_at IS NULL THEN now()
      ELSE published_at
    END
  WHERE id = p_template_id AND author_id = v_user_id;

  RETURN FOUND;
END;
$$;

-- 13. Grants para service role (admin)
GRANT ALL ON profile_templates TO service_role;
GRANT ALL ON profile_template_interactions TO service_role;
