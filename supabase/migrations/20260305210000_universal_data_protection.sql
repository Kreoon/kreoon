-- ============================================================================
-- SISTEMA UNIVERSAL DE PROTECCIÓN DE DATOS
-- ============================================================================
-- Protege TODA la información crítica de la plataforma:
-- - Soft delete universal (nada se elimina permanentemente)
-- - Backup automático antes de cualquier eliminación
-- - Solo root puede hacer hard delete
-- - Restauración fácil desde papelera o backups
-- ============================================================================

-- 1. TABLA UNIVERSAL DE BACKUP
-- ============================================================================
CREATE TABLE IF NOT EXISTS platform_backup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación del registro
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  organization_id UUID,

  -- Snapshot completo
  record_snapshot JSONB NOT NULL,
  related_records JSONB DEFAULT '{}', -- Registros relacionados (FK)

  -- Metadata
  backup_type TEXT NOT NULL CHECK (backup_type IN ('soft_delete', 'hard_delete', 'manual', 'auto', 'update')),
  backup_reason TEXT,
  backed_up_at TIMESTAMPTZ DEFAULT NOW(),
  backed_up_by UUID REFERENCES profiles(id),

  -- Restauración
  restored_at TIMESTAMPTZ DEFAULT NULL,
  restored_by UUID REFERENCES profiles(id),

  -- Búsqueda
  record_name TEXT, -- Nombre/título para identificar fácilmente

  CONSTRAINT platform_backup_unique UNIQUE (table_name, record_id, backed_up_at)
);

CREATE INDEX IF NOT EXISTS idx_platform_backup_table ON platform_backup(table_name);
CREATE INDEX IF NOT EXISTS idx_platform_backup_record ON platform_backup(record_id);
CREATE INDEX IF NOT EXISTS idx_platform_backup_org ON platform_backup(organization_id);
CREATE INDEX IF NOT EXISTS idx_platform_backup_date ON platform_backup(backed_up_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_backup_not_restored ON platform_backup(restored_at) WHERE restored_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_platform_backup_type ON platform_backup(backup_type);

ALTER TABLE platform_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_backup_org_read" ON platform_backup
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_member_roles WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  );

COMMENT ON TABLE platform_backup IS 'Backup universal de todos los registros eliminados de la plataforma';

-- 2. AGREGAR CAMPOS DE SOFT DELETE A TABLAS CRÍTICAS
-- ============================================================================

-- Clients
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_deleted ON clients(deleted_at) WHERE deleted_at IS NULL;

-- Products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(deleted_at) WHERE deleted_at IS NULL;

-- Product DNA
ALTER TABLE product_dna
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_product_dna_deleted ON product_dna(deleted_at) WHERE deleted_at IS NULL;

-- Client DNA
ALTER TABLE client_dna
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_client_dna_deleted ON client_dna(deleted_at) WHERE deleted_at IS NULL;

-- Portfolio Items
ALTER TABLE portfolio_items
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_portfolio_items_deleted ON portfolio_items(deleted_at) WHERE deleted_at IS NULL;

-- Portfolio Posts
ALTER TABLE portfolio_posts
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_portfolio_posts_deleted ON portfolio_posts(deleted_at) WHERE deleted_at IS NULL;

-- Creator Profiles
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_creator_profiles_deleted ON creator_profiles(deleted_at) WHERE deleted_at IS NULL;

-- Organizations (crítico)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_deleted ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- Organization Members
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_org_members_deleted ON organization_members(deleted_at) WHERE deleted_at IS NULL;

-- Brands
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_brands_deleted ON brands(deleted_at) WHERE deleted_at IS NULL;

-- Creator Services
ALTER TABLE creator_services
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_creator_services_deleted ON creator_services(deleted_at) WHERE deleted_at IS NULL;

-- Scheduled Posts
ALTER TABLE scheduled_posts
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_deleted ON scheduled_posts(deleted_at) WHERE deleted_at IS NULL;

-- Social Accounts
ALTER TABLE social_accounts
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_social_accounts_deleted ON social_accounts(deleted_at) WHERE deleted_at IS NULL;

-- Booking Event Types
ALTER TABLE booking_event_types
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_event_types_deleted ON booking_event_types(deleted_at) WHERE deleted_at IS NULL;

-- Project Assignments
ALTER TABLE project_assignments
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_project_assignments_deleted ON project_assignments(deleted_at) WHERE deleted_at IS NULL;

-- 3. FUNCIÓN GENÉRICA PARA CREAR BACKUP
-- ============================================================================
CREATE OR REPLACE FUNCTION create_universal_backup(
  p_table_name TEXT,
  p_record_id UUID,
  p_backup_type TEXT DEFAULT 'soft_delete',
  p_reason TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_backup_id UUID;
  v_record JSONB;
  v_org_id UUID;
  v_record_name TEXT;
  v_query TEXT;
BEGIN
  -- Obtener el registro como JSON
  v_query := format('SELECT to_jsonb(t.*) FROM %I t WHERE t.id = $1', p_table_name);
  EXECUTE v_query INTO v_record USING p_record_id;

  IF v_record IS NULL THEN
    RETURN NULL;
  END IF;

  -- Extraer organization_id si existe
  v_org_id := (v_record->>'organization_id')::UUID;

  -- Extraer nombre/título para identificación
  v_record_name := COALESCE(
    v_record->>'title',
    v_record->>'name',
    v_record->>'full_name',
    v_record->>'display_name',
    v_record->>'id'
  );

  -- Crear backup
  INSERT INTO platform_backup (
    table_name,
    record_id,
    organization_id,
    record_snapshot,
    backup_type,
    backup_reason,
    backed_up_by,
    record_name
  ) VALUES (
    p_table_name,
    p_record_id,
    v_org_id,
    v_record,
    p_backup_type,
    p_reason,
    COALESCE(p_user_id, auth.uid()),
    v_record_name
  )
  RETURNING id INTO v_backup_id;

  RETURN v_backup_id;
END;
$$;

-- 4. FUNCIÓN GENÉRICA PARA SOFT DELETE
-- ============================================================================
CREATE OR REPLACE FUNCTION universal_soft_delete(
  p_table_name TEXT,
  p_record_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_backup_id UUID;
  v_user_id UUID;
  v_record_name TEXT;
  v_query TEXT;
  v_has_deleted_at BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  -- Verificar si la tabla tiene campo deleted_at
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = p_table_name AND column_name = 'deleted_at'
  ) INTO v_has_deleted_at;

  IF NOT v_has_deleted_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tabla no soporta soft delete');
  END IF;

  -- Crear backup
  v_backup_id := create_universal_backup(p_table_name, p_record_id, 'soft_delete', p_reason, v_user_id);

  IF v_backup_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registro no encontrado');
  END IF;

  -- Obtener nombre para audit log
  SELECT record_name INTO v_record_name FROM platform_backup WHERE id = v_backup_id;

  -- Marcar como eliminado
  v_query := format('UPDATE %I SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', p_table_name);
  EXECUTE v_query USING v_user_id, p_record_id;

  -- Registrar en audit_log
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, entity_name, details)
  VALUES (
    v_user_id,
    p_table_name || '_soft_deleted',
    p_table_name,
    p_record_id,
    v_record_name,
    jsonb_build_object('backup_id', v_backup_id, 'reason', p_reason, 'can_restore', true)
  );

  RETURN jsonb_build_object(
    'success', true,
    'backup_id', v_backup_id,
    'message', 'Registro movido a papelera'
  );
END;
$$;

-- 5. FUNCIÓN GENÉRICA PARA RESTAURAR DESDE PAPELERA
-- ============================================================================
CREATE OR REPLACE FUNCTION universal_restore_from_trash(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_query TEXT;
  v_backup_id UUID;
  v_record_name TEXT;
BEGIN
  v_user_id := auth.uid();

  -- Restaurar (quitar deleted_at)
  v_query := format('UPDATE %I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id', p_table_name);
  EXECUTE v_query INTO v_record_name USING p_record_id;

  IF v_record_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registro no encontrado en papelera');
  END IF;

  -- Marcar backup como restaurado
  UPDATE platform_backup
  SET restored_at = NOW(), restored_by = v_user_id
  WHERE table_name = p_table_name
    AND record_id = p_record_id
    AND restored_at IS NULL
    AND backed_up_at = (
      SELECT MAX(backed_up_at) FROM platform_backup
      WHERE table_name = p_table_name AND record_id = p_record_id AND restored_at IS NULL
    )
  RETURNING id, record_name INTO v_backup_id, v_record_name;

  -- Registrar en audit_log
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, entity_name, details)
  VALUES (
    v_user_id,
    p_table_name || '_restored',
    p_table_name,
    p_record_id,
    v_record_name,
    jsonb_build_object('restored_from_backup', v_backup_id)
  );

  RETURN jsonb_build_object('success', true, 'message', 'Registro restaurado exitosamente');
END;
$$;

-- 6. FUNCIÓN GENÉRICA PARA RESTAURAR DESDE BACKUP (INCLUYENDO HARD DELETE)
-- ============================================================================
CREATE OR REPLACE FUNCTION universal_restore_from_backup(
  p_backup_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_backup RECORD;
  v_record_exists BOOLEAN;
  v_query TEXT;
BEGIN
  v_user_id := auth.uid();

  -- Obtener backup
  SELECT * INTO v_backup FROM platform_backup WHERE id = p_backup_id AND restored_at IS NULL;

  IF v_backup IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Backup no encontrado o ya restaurado');
  END IF;

  -- Verificar si el registro existe
  v_query := format('SELECT EXISTS(SELECT 1 FROM %I WHERE id = $1)', v_backup.table_name);
  EXECUTE v_query INTO v_record_exists USING v_backup.record_id;

  IF v_record_exists THEN
    -- Si existe, quitar soft delete
    v_query := format('UPDATE %I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1', v_backup.table_name);
    EXECUTE v_query USING v_backup.record_id;
  ELSE
    -- Si no existe, recrear desde backup
    v_query := format('INSERT INTO %I SELECT * FROM jsonb_populate_record(NULL::%I, $1)', v_backup.table_name, v_backup.table_name);
    EXECUTE v_query USING v_backup.record_snapshot;
  END IF;

  -- Marcar backup como restaurado
  UPDATE platform_backup SET restored_at = NOW(), restored_by = v_user_id WHERE id = p_backup_id;

  -- Registrar en audit_log
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, entity_name, details)
  VALUES (
    v_user_id,
    v_backup.table_name || '_restored_from_backup',
    v_backup.table_name,
    v_backup.record_id,
    v_backup.record_name,
    jsonb_build_object('backup_id', p_backup_id, 'was_hard_deleted', NOT v_record_exists)
  );

  RETURN jsonb_build_object(
    'success', true,
    'record_id', v_backup.record_id,
    'message', 'Registro restaurado desde backup'
  );
END;
$$;

-- 7. FUNCIÓN HELPER PARA CREAR TRIGGER DE PROTECCIÓN
-- ============================================================================
CREATE OR REPLACE FUNCTION create_delete_protection_trigger(p_table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_trigger_name TEXT;
  v_function_name TEXT;
BEGIN
  v_trigger_name := 'trigger_protect_delete_' || p_table_name;
  v_function_name := 'protect_delete_' || p_table_name;

  -- Crear función del trigger
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $fn$
    DECLARE
      v_is_root BOOLEAN;
      v_user_id UUID;
    BEGIN
      v_user_id := auth.uid();

      IF v_user_id IS NULL THEN
        PERFORM create_universal_backup(%L, OLD.id, ''hard_delete'', ''Service deletion'', NULL);
        RETURN OLD;
      END IF;

      SELECT EXISTS(
        SELECT 1 FROM profiles
        WHERE id = v_user_id
        AND (email IN (''root@kreoon.com'', ''admin@kreoon.com'', ''alexander@kreoon.com'') OR is_platform_admin = true)
      ) INTO v_is_root;

      IF v_is_root THEN
        PERFORM create_universal_backup(%L, OLD.id, ''hard_delete'', ''Root deletion'', v_user_id);
        RETURN OLD;
      END IF;

      -- Convertir a soft delete
      PERFORM universal_soft_delete(%L, OLD.id, ''Eliminación convertida a soft delete'');

      RETURN NULL;
    END;
    $fn$;
  ', v_function_name, p_table_name, p_table_name, p_table_name);

  -- Eliminar trigger existente si existe
  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', v_trigger_name, p_table_name);

  -- Crear trigger
  EXECUTE format('
    CREATE TRIGGER %I
    BEFORE DELETE ON %I
    FOR EACH ROW
    EXECUTE FUNCTION %I()
  ', v_trigger_name, p_table_name, v_function_name);
END;
$$;

-- 8. CREAR TRIGGERS DE PROTECCIÓN PARA TODAS LAS TABLAS CRÍTICAS
-- ============================================================================
SELECT create_delete_protection_trigger('clients');
SELECT create_delete_protection_trigger('products');
SELECT create_delete_protection_trigger('product_dna');
SELECT create_delete_protection_trigger('client_dna');
SELECT create_delete_protection_trigger('portfolio_items');
SELECT create_delete_protection_trigger('portfolio_posts');
SELECT create_delete_protection_trigger('creator_profiles');
SELECT create_delete_protection_trigger('organizations');
SELECT create_delete_protection_trigger('organization_members');
SELECT create_delete_protection_trigger('brands');
SELECT create_delete_protection_trigger('creator_services');
SELECT create_delete_protection_trigger('scheduled_posts');
SELECT create_delete_protection_trigger('social_accounts');
SELECT create_delete_protection_trigger('booking_event_types');
SELECT create_delete_protection_trigger('project_assignments');

-- 9. VISTA UNIVERSAL DE PAPELERA
-- ============================================================================
CREATE OR REPLACE VIEW platform_trash AS
SELECT
  pb.id as backup_id,
  pb.table_name,
  pb.record_id,
  pb.record_name,
  pb.organization_id,
  pb.backed_up_at as deleted_at,
  pb.backed_up_by as deleted_by,
  p.full_name as deleted_by_name,
  pb.backup_reason as deletion_reason,
  pb.backup_type
FROM platform_backup pb
LEFT JOIN profiles p ON p.id = pb.backed_up_by
WHERE pb.restored_at IS NULL
  AND pb.backup_type IN ('soft_delete', 'hard_delete')
ORDER BY pb.backed_up_at DESC;

-- 10. FUNCIÓN PARA OBTENER ESTADÍSTICAS DE PAPELERA
-- ============================================================================
CREATE OR REPLACE FUNCTION get_trash_stats(p_organization_id UUID DEFAULT NULL)
RETURNS TABLE (
  table_name TEXT,
  item_count BIGINT,
  oldest_item TIMESTAMPTZ,
  newest_item TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pb.table_name,
    COUNT(*)::BIGINT as item_count,
    MIN(pb.backed_up_at) as oldest_item,
    MAX(pb.backed_up_at) as newest_item
  FROM platform_backup pb
  WHERE pb.restored_at IS NULL
    AND pb.backup_type IN ('soft_delete', 'hard_delete')
    AND (p_organization_id IS NULL OR pb.organization_id = p_organization_id)
  GROUP BY pb.table_name
  ORDER BY item_count DESC;
END;
$$;

-- 11. FUNCIÓN PARA VACIAR PAPELERA (SOLO ROOT)
-- ============================================================================
CREATE OR REPLACE FUNCTION empty_platform_trash(
  p_table_name TEXT DEFAULT NULL,
  p_older_than_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_root BOOLEAN;
  v_count INTEGER := 0;
  v_backup RECORD;
  v_query TEXT;
BEGIN
  v_user_id := auth.uid();

  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = v_user_id
    AND (email IN ('root@kreoon.com', 'admin@kreoon.com', 'alexander@kreoon.com') OR is_platform_admin = true)
  ) INTO v_is_root;

  IF NOT v_is_root THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo root puede vaciar la papelera');
  END IF;

  -- Eliminar registros permanentemente
  FOR v_backup IN
    SELECT * FROM platform_backup
    WHERE restored_at IS NULL
      AND backup_type IN ('soft_delete', 'hard_delete')
      AND backed_up_at < NOW() - (p_older_than_days || ' days')::INTERVAL
      AND (p_table_name IS NULL OR table_name = p_table_name)
  LOOP
    -- Intentar eliminar el registro si existe
    BEGIN
      v_query := format('DELETE FROM %I WHERE id = $1 AND deleted_at IS NOT NULL', v_backup.table_name);
      EXECUTE v_query USING v_backup.record_id;
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Ignorar errores (registro puede no existir)
      NULL;
    END;
  END LOOP;

  -- Marcar backups como permanentemente eliminados (no restaurables)
  UPDATE platform_backup
  SET backup_type = 'hard_delete', backup_reason = COALESCE(backup_reason, '') || ' [PURGED]'
  WHERE restored_at IS NULL
    AND backup_type = 'soft_delete'
    AND backed_up_at < NOW() - (p_older_than_days || ' days')::INTERVAL
    AND (p_table_name IS NULL OR table_name = p_table_name);

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_count,
    'message', format('Eliminados %s registros de la papelera (más de %s días)', v_count, p_older_than_days)
  );
END;
$$;

-- 12. COMENTARIOS
-- ============================================================================
COMMENT ON FUNCTION create_universal_backup IS 'Crea backup de cualquier registro antes de eliminar';
COMMENT ON FUNCTION universal_soft_delete IS 'Soft delete genérico para cualquier tabla protegida';
COMMENT ON FUNCTION universal_restore_from_trash IS 'Restaura registro desde papelera';
COMMENT ON FUNCTION universal_restore_from_backup IS 'Restaura desde backup incluso si fue hard deleted';
COMMENT ON FUNCTION get_trash_stats IS 'Estadísticas de elementos en papelera';
COMMENT ON FUNCTION empty_platform_trash IS 'Vacía papelera de elementos antiguos. SOLO ROOT.';
COMMENT ON VIEW platform_trash IS 'Vista unificada de todos los elementos en papelera';
