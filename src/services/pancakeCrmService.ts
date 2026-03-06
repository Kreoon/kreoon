/**
 * Pancake CRM Service
 * Servicio para integración bidireccional Kreoon ↔ Pancake CRM POS
 */
import { supabase } from '@/integrations/supabase/client';

export interface PancakeSyncResult {
  success: boolean;
  action?: 'create' | 'update';
  pancake_record_id?: string;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

export interface PancakeBulkSyncResult {
  success: boolean;
  results: {
    users: { synced: number; errors: number; total: number };
    organizations: { synced: number; errors: number; total: number };
    errors_detail: Array<{ entity_type: string; entity_id: string; error: string }>;
  };
  summary: {
    total_users_in_kreoon: number;
    total_orgs_in_kreoon: number;
    synced_users: number;
    synced_orgs: number;
    pending_users: number;
    pending_orgs: number;
  };
  pagination: {
    offset: number;
    batch_size: number;
    has_more: boolean;
    next_offset: number | null;
  };
}

export interface PancakeSetupResult {
  success: boolean;
  shop_id: string;
  shop_name: string;
  tables_created: {
    kreoon_users: { status: number; response: unknown };
    kreoon_organizations: { status: number; response: unknown };
  };
  webhook_config: {
    url: string;
    secret_header: string;
    secret_value: string;
  };
  next_steps: string[];
}

export interface PancakeSyncMapEntry {
  id: string;
  kreoon_entity_type: 'user' | 'organization';
  kreoon_entity_id: string;
  pancake_record_id: string | null;
  pancake_table_name: string;
  sync_status: 'pending' | 'synced' | 'error' | 'skip';
  last_synced_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface PancakeSyncLogEntry {
  id: string;
  direction: 'kreoon_to_pancake' | 'pancake_to_kreoon';
  entity_type: string;
  entity_id: string;
  action: 'create' | 'update' | 'delete';
  payload: unknown;
  response: unknown;
  status: 'success' | 'error';
  error_message: string | null;
  created_at: string;
}

export interface PancakeIntegrationConfig {
  shop_id: string | null;
  sync_users_enabled: boolean;
  sync_organizations_enabled: boolean;
  webhook_secret: string;
}

/**
 * Ejecuta el setup inicial de Pancake (obtiene Shop ID y crea tablas)
 * Solo debe ejecutarse una vez por admin
 */
export async function runPancakeSetup(): Promise<PancakeSetupResult> {
  const { data, error } = await supabase.functions.invoke<PancakeSetupResult>('pancake-setup');

  if (error) {
    throw new Error(`Error en pancake-setup: ${error.message}`);
  }

  return data!;
}

/**
 * Sincroniza un usuario específico con Pancake CRM
 * Se llama automáticamente al registrar/actualizar usuarios
 */
export async function syncUserToPancake(userId: string): Promise<PancakeSyncResult> {
  const { data, error } = await supabase.functions.invoke<PancakeSyncResult>('pancake-sync-user', {
    body: { user_id: userId }
  });

  if (error) {
    console.warn('Error syncing user to Pancake:', error);
    return { success: false, error: error.message };
  }

  return data!;
}

/**
 * Sincroniza una organización específica con Pancake CRM
 * Se llama automáticamente al crear/actualizar organizaciones
 */
export async function syncOrganizationToPancake(organizationId: string): Promise<PancakeSyncResult> {
  const { data, error } = await supabase.functions.invoke<PancakeSyncResult>('pancake-sync-organization', {
    body: { organization_id: organizationId }
  });

  if (error) {
    console.warn('Error syncing organization to Pancake:', error);
    return { success: false, error: error.message };
  }

  return data!;
}

/**
 * Ejecuta sincronización masiva de usuarios y/o organizaciones
 */
export async function runBulkSync(options?: {
  entity_type?: 'users' | 'organizations' | 'both';
  batch_size?: number;
  offset?: number;
}): Promise<PancakeBulkSyncResult> {
  const { data, error } = await supabase.functions.invoke<PancakeBulkSyncResult>('pancake-bulk-sync', {
    body: {
      entity_type: options?.entity_type || 'both',
      batch_size: options?.batch_size || 50,
      offset: options?.offset || 0
    }
  });

  if (error) {
    throw new Error(`Error en pancake-bulk-sync: ${error.message}`);
  }

  return data!;
}

/**
 * Obtiene la configuración actual de la integración
 */
export async function getPancakeConfig(): Promise<PancakeIntegrationConfig> {
  const { data, error } = await supabase
    .from('pancake_integration_config')
    .select('config_key, config_value');

  if (error) {
    throw new Error(`Error obteniendo config: ${error.message}`);
  }

  const config: Record<string, string | null> = {};
  for (const row of data || []) {
    config[row.config_key] = row.config_value;
  }

  return {
    shop_id: config.shop_id || null,
    sync_users_enabled: config.sync_users_enabled === 'true',
    sync_organizations_enabled: config.sync_organizations_enabled === 'true',
    webhook_secret: config.webhook_secret || ''
  };
}

/**
 * Actualiza la configuración de la integración
 */
export async function updatePancakeConfig(
  key: 'sync_users_enabled' | 'sync_organizations_enabled',
  value: boolean
): Promise<void> {
  const { error } = await supabase
    .from('pancake_integration_config')
    .upsert({
      config_key: key,
      config_value: String(value),
      updated_at: new Date().toISOString()
    }, { onConflict: 'config_key' });

  if (error) {
    throw new Error(`Error actualizando config: ${error.message}`);
  }
}

/**
 * Obtiene estadísticas de sincronización
 */
export async function getPancakeSyncStats(): Promise<{
  total_synced_users: number;
  total_synced_orgs: number;
  pending_users: number;
  pending_orgs: number;
  error_users: number;
  error_orgs: number;
}> {
  const { data: syncMap } = await supabase
    .from('pancake_sync_map')
    .select('kreoon_entity_type, sync_status');

  const stats = {
    total_synced_users: 0,
    total_synced_orgs: 0,
    pending_users: 0,
    pending_orgs: 0,
    error_users: 0,
    error_orgs: 0
  };

  for (const entry of syncMap || []) {
    if (entry.kreoon_entity_type === 'user') {
      if (entry.sync_status === 'synced') stats.total_synced_users++;
      else if (entry.sync_status === 'pending') stats.pending_users++;
      else if (entry.sync_status === 'error') stats.error_users++;
    } else if (entry.kreoon_entity_type === 'organization') {
      if (entry.sync_status === 'synced') stats.total_synced_orgs++;
      else if (entry.sync_status === 'pending') stats.pending_orgs++;
      else if (entry.sync_status === 'error') stats.error_orgs++;
    }
  }

  return stats;
}

/**
 * Obtiene el log de sincronización reciente
 */
export async function getPancakeSyncLog(limit = 50): Promise<PancakeSyncLogEntry[]> {
  const { data, error } = await supabase
    .from('pancake_sync_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Error obteniendo log: ${error.message}`);
  }

  return (data || []) as PancakeSyncLogEntry[];
}

/**
 * Verifica el estado de sincronización de una entidad específica
 */
export async function getSyncStatus(
  entityType: 'user' | 'organization',
  entityId: string
): Promise<PancakeSyncMapEntry | null> {
  const { data, error } = await supabase
    .from('pancake_sync_map')
    .select('*')
    .eq('kreoon_entity_type', entityType)
    .eq('kreoon_entity_id', entityId)
    .maybeSingle();

  if (error) {
    console.warn('Error obteniendo estado de sync:', error);
    return null;
  }

  return data as PancakeSyncMapEntry | null;
}

/**
 * Trigger de sincronización silencioso (fire-and-forget)
 * Usado internamente después de crear/actualizar entidades
 */
export function triggerUserSyncSilent(userId: string): void {
  syncUserToPancake(userId).catch(err => {
    console.warn('Pancake sync failed (non-blocking):', err);
  });
}

export function triggerOrgSyncSilent(organizationId: string): void {
  syncOrganizationToPancake(organizationId).catch(err => {
    console.warn('Pancake sync failed (non-blocking):', err);
  });
}
