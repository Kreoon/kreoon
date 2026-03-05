-- ============================================================================
-- SISTEMA DE PROTECCIÓN DE CONTENIDO: SOFT DELETE + BACKUP + PAPELERA
-- ============================================================================
-- Este sistema protege contra pérdida de datos:
-- 1. Soft Delete: El contenido no se elimina, solo se marca como eliminado
-- 2. Backup automático: Antes de marcar como eliminado, se guarda copia completa
-- 3. Papelera: Los usuarios pueden ver y restaurar contenido eliminado
-- 4. Solo root puede hacer hard delete (eliminación permanente)
-- ============================================================================

-- 1. AGREGAR CAMPOS DE SOFT DELETE A LA TABLA CONTENT
-- ============================================================================
ALTER TABLE content
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT DEFAULT NULL;

-- Índice para filtrar contenido activo rápidamente
CREATE INDEX IF NOT EXISTS idx_content_deleted_at ON content(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_deleted_at_not_null ON content(deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN content.deleted_at IS 'Fecha de eliminación (soft delete). NULL = contenido activo';
COMMENT ON COLUMN content.deleted_by IS 'Usuario que eliminó el contenido';
COMMENT ON COLUMN content.deletion_reason IS 'Razón de la eliminación (opcional)';

-- 2. CREAR TABLA DE BACKUP COMPLETO DE CONTENIDO
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_backup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  organization_id UUID REFERENCES organizations(id),

  -- Snapshot completo del contenido
  content_snapshot JSONB NOT NULL,

  -- Metadata del backup
  backup_type TEXT NOT NULL CHECK (backup_type IN ('soft_delete', 'hard_delete', 'manual', 'auto')),
  backed_up_at TIMESTAMPTZ DEFAULT NOW(),
  backed_up_by UUID REFERENCES profiles(id),

  -- Para restauración
  restored_at TIMESTAMPTZ DEFAULT NULL,
  restored_by UUID REFERENCES profiles(id),

  -- Índices para búsqueda
  content_title TEXT,
  client_id UUID,

  CONSTRAINT content_backup_unique_per_delete UNIQUE (content_id, backed_up_at)
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_content_backup_org ON content_backup(organization_id);
CREATE INDEX IF NOT EXISTS idx_content_backup_content_id ON content_backup(content_id);
CREATE INDEX IF NOT EXISTS idx_content_backup_date ON content_backup(backed_up_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_backup_not_restored ON content_backup(restored_at) WHERE restored_at IS NULL;

-- RLS para content_backup
ALTER TABLE content_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_backup_org_read" ON content_backup
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Solo admins pueden ver backups
CREATE POLICY "content_backup_admin_all" ON content_backup
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_member_roles omr
      WHERE omr.user_id = auth.uid()
        AND omr.organization_id = content_backup.organization_id
        AND omr.role = 'admin'
    )
  );

COMMENT ON TABLE content_backup IS 'Respaldo automático de contenido antes de eliminación';

-- 3. CREAR TABLA DE BACKUP DE SCRIPTS (VERSIONES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_script_backup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_backup_id UUID REFERENCES content_backup(id) ON DELETE CASCADE,

  -- Copia de todas las versiones de script
  script_versions JSONB NOT NULL,

  backed_up_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_script_backup_content ON content_script_backup(content_id);

-- 4. FUNCIÓN PARA CREAR BACKUP COMPLETO
-- ============================================================================
CREATE OR REPLACE FUNCTION create_content_backup(
  p_content_id UUID,
  p_backup_type TEXT DEFAULT 'soft_delete',
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_backup_id UUID;
  v_content JSONB;
  v_script_versions JSONB;
  v_org_id UUID;
  v_title TEXT;
  v_client_id UUID;
BEGIN
  -- Obtener contenido completo como JSON
  SELECT
    to_jsonb(c.*),
    c.organization_id,
    c.title,
    c.client_id
  INTO v_content, v_org_id, v_title, v_client_id
  FROM content c
  WHERE c.id = p_content_id;

  IF v_content IS NULL THEN
    RAISE EXCEPTION 'Contenido no encontrado: %', p_content_id;
  END IF;

  -- Obtener todas las versiones de script
  SELECT COALESCE(jsonb_agg(to_jsonb(csv.*) ORDER BY csv.version DESC), '[]'::jsonb)
  INTO v_script_versions
  FROM content_script_versions csv
  WHERE csv.content_id = p_content_id;

  -- Crear backup del contenido
  INSERT INTO content_backup (
    content_id,
    organization_id,
    content_snapshot,
    backup_type,
    backed_up_by,
    content_title,
    client_id
  ) VALUES (
    p_content_id,
    v_org_id,
    v_content,
    p_backup_type,
    COALESCE(p_user_id, auth.uid()),
    v_title,
    v_client_id
  )
  RETURNING id INTO v_backup_id;

  -- Crear backup de versiones de script si existen
  IF jsonb_array_length(v_script_versions) > 0 THEN
    INSERT INTO content_script_backup (
      content_id,
      content_backup_id,
      script_versions
    ) VALUES (
      p_content_id,
      v_backup_id,
      v_script_versions
    );
  END IF;

  RETURN v_backup_id;
END;
$$;

-- 5. FUNCIÓN PARA SOFT DELETE (MOVER A PAPELERA)
-- ============================================================================
CREATE OR REPLACE FUNCTION soft_delete_content(
  p_content_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_backup_id UUID;
  v_user_id UUID;
  v_content_title TEXT;
BEGIN
  v_user_id := auth.uid();

  -- Verificar que el contenido existe y no está ya eliminado
  SELECT title INTO v_content_title
  FROM content
  WHERE id = p_content_id AND deleted_at IS NULL;

  IF v_content_title IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Contenido no encontrado o ya eliminado'
    );
  END IF;

  -- Crear backup antes de eliminar
  v_backup_id := create_content_backup(p_content_id, 'soft_delete', v_user_id);

  -- Marcar como eliminado (soft delete)
  UPDATE content
  SET
    deleted_at = NOW(),
    deleted_by = v_user_id,
    deletion_reason = p_reason
  WHERE id = p_content_id;

  -- Registrar en audit_log
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, entity_name, details)
  VALUES (
    v_user_id,
    'content_soft_deleted',
    'content',
    p_content_id,
    v_content_title,
    jsonb_build_object(
      'backup_id', v_backup_id,
      'reason', p_reason,
      'can_restore', true
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'backup_id', v_backup_id,
    'message', 'Contenido movido a papelera. Puede ser restaurado.'
  );
END;
$$;

-- 6. FUNCIÓN PARA RESTAURAR DESDE PAPELERA
-- ============================================================================
CREATE OR REPLACE FUNCTION restore_content_from_trash(
  p_content_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_content_title TEXT;
  v_backup_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Verificar que el contenido está eliminado
  SELECT title INTO v_content_title
  FROM content
  WHERE id = p_content_id AND deleted_at IS NOT NULL;

  IF v_content_title IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Contenido no encontrado en papelera'
    );
  END IF;

  -- Restaurar (quitar marca de eliminado)
  UPDATE content
  SET
    deleted_at = NULL,
    deleted_by = NULL,
    deletion_reason = NULL
  WHERE id = p_content_id;

  -- Marcar backup como restaurado
  UPDATE content_backup
  SET
    restored_at = NOW(),
    restored_by = v_user_id
  WHERE content_id = p_content_id
    AND restored_at IS NULL
  ORDER BY backed_up_at DESC
  LIMIT 1
  RETURNING id INTO v_backup_id;

  -- Registrar en audit_log
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, entity_name, details)
  VALUES (
    v_user_id,
    'content_restored',
    'content',
    p_content_id,
    v_content_title,
    jsonb_build_object('restored_from_backup', v_backup_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Contenido restaurado exitosamente'
  );
END;
$$;

-- 7. FUNCIÓN PARA RESTAURAR DESDE BACKUP (INCLUYENDO HARD DELETE)
-- ============================================================================
CREATE OR REPLACE FUNCTION restore_content_from_backup(
  p_backup_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_backup RECORD;
  v_content_exists BOOLEAN;
  v_new_content_id UUID;
  v_script_backup RECORD;
BEGIN
  v_user_id := auth.uid();

  -- Obtener backup
  SELECT * INTO v_backup
  FROM content_backup
  WHERE id = p_backup_id AND restored_at IS NULL;

  IF v_backup IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Backup no encontrado o ya restaurado'
    );
  END IF;

  -- Verificar si el contenido original existe
  SELECT EXISTS(SELECT 1 FROM content WHERE id = v_backup.content_id)
  INTO v_content_exists;

  IF v_content_exists THEN
    -- Si existe, solo quitar soft delete
    UPDATE content
    SET
      deleted_at = NULL,
      deleted_by = NULL,
      deletion_reason = NULL
    WHERE id = v_backup.content_id;

    v_new_content_id := v_backup.content_id;
  ELSE
    -- Si no existe (fue hard deleted), recrear desde backup
    INSERT INTO content
    SELECT * FROM jsonb_populate_record(NULL::content, v_backup.content_snapshot)
    RETURNING id INTO v_new_content_id;

    -- Restaurar versiones de script si existen
    SELECT * INTO v_script_backup
    FROM content_script_backup
    WHERE content_backup_id = p_backup_id;

    IF v_script_backup IS NOT NULL THEN
      INSERT INTO content_script_versions
      SELECT * FROM jsonb_populate_recordset(NULL::content_script_versions, v_script_backup.script_versions);
    END IF;
  END IF;

  -- Marcar backup como restaurado
  UPDATE content_backup
  SET
    restored_at = NOW(),
    restored_by = v_user_id
  WHERE id = p_backup_id;

  -- Registrar en audit_log
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, entity_name, details)
  VALUES (
    v_user_id,
    'content_restored_from_backup',
    'content',
    v_new_content_id,
    v_backup.content_title,
    jsonb_build_object(
      'backup_id', p_backup_id,
      'was_hard_deleted', NOT v_content_exists
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'content_id', v_new_content_id,
    'message', 'Contenido restaurado desde backup'
  );
END;
$$;

-- 8. FUNCIÓN PARA HARD DELETE (SOLO ROOT)
-- ============================================================================
CREATE OR REPLACE FUNCTION hard_delete_content(
  p_content_id UUID,
  p_reason TEXT DEFAULT 'Eliminación permanente por root'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_root BOOLEAN;
  v_backup_id UUID;
  v_content_title TEXT;
BEGIN
  v_user_id := auth.uid();

  -- Verificar si es root (platform admin)
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = v_user_id
    AND (
      email IN ('root@kreoon.com', 'admin@kreoon.com')
      OR is_platform_admin = true
    )
  ) INTO v_is_root;

  IF NOT v_is_root THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solo el administrador root puede eliminar permanentemente'
    );
  END IF;

  -- Obtener título antes de eliminar
  SELECT title INTO v_content_title
  FROM content WHERE id = p_content_id;

  IF v_content_title IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Contenido no encontrado'
    );
  END IF;

  -- Crear backup final antes de hard delete
  v_backup_id := create_content_backup(p_content_id, 'hard_delete', v_user_id);

  -- Eliminar versiones de script
  DELETE FROM content_script_versions WHERE content_id = p_content_id;

  -- Eliminar contenido permanentemente
  DELETE FROM content WHERE id = p_content_id;

  -- Registrar en audit_log
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, entity_name, details)
  VALUES (
    v_user_id,
    'content_hard_deleted',
    'content',
    p_content_id,
    v_content_title,
    jsonb_build_object(
      'backup_id', v_backup_id,
      'reason', p_reason,
      'can_restore', true,
      'deleted_by_root', true
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'backup_id', v_backup_id,
    'message', 'Contenido eliminado permanentemente. Backup disponible para restauración.'
  );
END;
$$;

-- 9. BLOQUEAR DELETE DIRECTO EN LA TABLA CONTENT
-- ============================================================================
-- Trigger que previene DELETE directo y fuerza soft delete
CREATE OR REPLACE FUNCTION prevent_hard_delete_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_root BOOLEAN;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Permitir si es una operación de servicio (no hay usuario)
  IF v_user_id IS NULL THEN
    -- Crear backup antes de permitir
    PERFORM create_content_backup(OLD.id, 'hard_delete', NULL);
    RETURN OLD;
  END IF;

  -- Verificar si es root
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = v_user_id
    AND (
      email IN ('root@kreoon.com', 'admin@kreoon.com')
      OR is_platform_admin = true
    )
  ) INTO v_is_root;

  IF v_is_root THEN
    -- Root puede eliminar, pero siempre hacer backup
    PERFORM create_content_backup(OLD.id, 'hard_delete', v_user_id);
    RETURN OLD;
  END IF;

  -- Para usuarios normales, convertir a soft delete
  UPDATE content
  SET
    deleted_at = NOW(),
    deleted_by = v_user_id,
    deletion_reason = 'Eliminación convertida a soft delete'
  WHERE id = OLD.id;

  -- Crear backup
  PERFORM create_content_backup(OLD.id, 'soft_delete', v_user_id);

  -- Registrar intento de hard delete convertido
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, entity_name, details)
  VALUES (
    v_user_id,
    'content_delete_blocked',
    'content',
    OLD.id,
    OLD.title,
    jsonb_build_object(
      'action_taken', 'converted_to_soft_delete',
      'message', 'Intento de eliminación permanente convertido a papelera'
    )
  );

  -- Prevenir el DELETE real
  RETURN NULL;
END;
$$;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_prevent_hard_delete_content ON content;
CREATE TRIGGER trigger_prevent_hard_delete_content
  BEFORE DELETE ON content
  FOR EACH ROW
  EXECUTE FUNCTION prevent_hard_delete_content();

-- 10. VISTAS ÚTILES
-- ============================================================================

-- Vista de contenido activo (excluye eliminados)
CREATE OR REPLACE VIEW content_active AS
SELECT * FROM content WHERE deleted_at IS NULL;

-- Vista de papelera
CREATE OR REPLACE VIEW content_trash AS
SELECT
  c.*,
  p.full_name as deleted_by_name,
  cb.id as backup_id
FROM content c
LEFT JOIN profiles p ON p.id = c.deleted_by
LEFT JOIN content_backup cb ON cb.content_id = c.id
  AND cb.backup_type = 'soft_delete'
  AND cb.restored_at IS NULL
WHERE c.deleted_at IS NOT NULL
ORDER BY c.deleted_at DESC;

-- Vista de backups disponibles para restaurar
CREATE OR REPLACE VIEW content_backups_available AS
SELECT
  cb.*,
  p.full_name as backed_up_by_name,
  c.id as current_content_id,
  CASE
    WHEN c.id IS NULL THEN 'hard_deleted'
    WHEN c.deleted_at IS NOT NULL THEN 'in_trash'
    ELSE 'active'
  END as content_status
FROM content_backup cb
LEFT JOIN profiles p ON p.id = cb.backed_up_by
LEFT JOIN content c ON c.id = cb.content_id
WHERE cb.restored_at IS NULL
ORDER BY cb.backed_up_at DESC;

-- 11. FUNCIÓN PARA VACIAR PAPELERA (SOLO ROOT, DESPUÉS DE X DÍAS)
-- ============================================================================
CREATE OR REPLACE FUNCTION empty_trash_older_than(
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_root BOOLEAN;
  v_count INTEGER;
BEGIN
  v_user_id := auth.uid();

  -- Verificar si es root
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = v_user_id
    AND (
      email IN ('root@kreoon.com', 'admin@kreoon.com')
      OR is_platform_admin = true
    )
  ) INTO v_is_root;

  IF NOT v_is_root THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solo root puede vaciar la papelera'
    );
  END IF;

  -- Contar elementos a eliminar
  SELECT COUNT(*) INTO v_count
  FROM content
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - (p_days || ' days')::INTERVAL;

  -- Eliminar permanentemente (el trigger creará backups)
  DELETE FROM content
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - (p_days || ' days')::INTERVAL;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_count,
    'message', format('Eliminados %s elementos de la papelera (más de %s días)', v_count, p_days)
  );
END;
$$;

-- 12. AGREGAR CAMPO is_platform_admin SI NO EXISTE
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_platform_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_platform_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 13. COMENTARIOS FINALES
-- ============================================================================
COMMENT ON FUNCTION soft_delete_content IS 'Mueve contenido a papelera (soft delete). Crea backup automático.';
COMMENT ON FUNCTION restore_content_from_trash IS 'Restaura contenido desde papelera.';
COMMENT ON FUNCTION restore_content_from_backup IS 'Restaura contenido desde backup, incluso si fue hard deleted.';
COMMENT ON FUNCTION hard_delete_content IS 'Elimina permanentemente. SOLO ROOT. Siempre crea backup.';
COMMENT ON FUNCTION empty_trash_older_than IS 'Vacía papelera de elementos antiguos. SOLO ROOT.';
COMMENT ON VIEW content_active IS 'Contenido activo (excluye papelera)';
COMMENT ON VIEW content_trash IS 'Contenido en papelera';
COMMENT ON VIEW content_backups_available IS 'Backups disponibles para restaurar';
