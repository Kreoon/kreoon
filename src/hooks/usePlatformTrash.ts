import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgOwner } from '@/hooks/useOrgOwner';

export interface TrashItem {
  backup_id: string;
  table_name: string;
  record_id: string;
  record_name: string | null;
  organization_id: string | null;
  deleted_at: string;
  deleted_by: string | null;
  deleted_by_name: string | null;
  deletion_reason: string | null;
  backup_type: 'soft_delete' | 'hard_delete';
}

export interface TrashStats {
  table_name: string;
  item_count: number;
  oldest_item: string;
  newest_item: string;
}

// Mapeo de nombres de tabla a nombres amigables
const TABLE_LABELS: Record<string, string> = {
  content: 'Contenido/Guiones',
  clients: 'Clientes',
  products: 'Productos',
  product_dna: 'DNA de Producto',
  client_dna: 'DNA de Cliente',
  portfolio_items: 'Items de Portfolio',
  portfolio_posts: 'Posts de Portfolio',
  creator_profiles: 'Perfiles de Creador',
  organizations: 'Organizaciones',
  organization_members: 'Miembros de Org',
  brands: 'Marcas',
  creator_services: 'Servicios de Creador',
  scheduled_posts: 'Posts Programados',
  social_accounts: 'Cuentas Sociales',
  booking_event_types: 'Tipos de Evento',
  project_assignments: 'Asignaciones de Proyecto',
};

export function getTableLabel(tableName: string): string {
  return TABLE_LABELS[tableName] || tableName;
}

/**
 * Hook universal para manejar la papelera de toda la plataforma
 */
export function usePlatformTrash(options: { tableName?: string } = {}) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [stats, setStats] = useState<TrashStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentOrgId, loading: orgLoading } = useOrgOwner();

  const fetchTrash = useCallback(async () => {
    if (orgLoading) return;

    try {
      setLoading(true);

      // Obtener items de la papelera
      let query = supabase
        .from('platform_backup')
        .select(`
          id,
          table_name,
          record_id,
          record_name,
          organization_id,
          backed_up_at,
          backed_up_by,
          backup_reason,
          backup_type,
          profiles:backed_up_by (full_name)
        `)
        .is('restored_at', null)
        .in('backup_type', ['soft_delete', 'hard_delete'])
        .order('backed_up_at', { ascending: false })
        .limit(200);

      if (currentOrgId) {
        query = query.or(`organization_id.eq.${currentOrgId},organization_id.is.null`);
      }

      if (options.tableName) {
        query = query.eq('table_name', options.tableName);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mappedItems: TrashItem[] = (data || []).map((item: any) => ({
        backup_id: item.id,
        table_name: item.table_name,
        record_id: item.record_id,
        record_name: item.record_name,
        organization_id: item.organization_id,
        deleted_at: item.backed_up_at,
        deleted_by: item.backed_up_by,
        deleted_by_name: item.profiles?.full_name || null,
        deletion_reason: item.backup_reason,
        backup_type: item.backup_type,
      }));

      setItems(mappedItems);

      // Obtener estadísticas
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_trash_stats', { p_organization_id: currentOrgId || null });

      if (!statsError && statsData) {
        setStats(statsData);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching platform trash:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar papelera');
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, orgLoading, options.tableName]);

  // Restaurar desde papelera (soft delete)
  const restoreFromTrash = async (tableName: string, recordId: string) => {
    const { data, error: restoreError } = await supabase.rpc('universal_restore_from_trash', {
      p_table_name: tableName,
      p_record_id: recordId,
    });

    if (restoreError) throw restoreError;
    if (data && !data.success) throw new Error(data.error || 'Error al restaurar');

    await fetchTrash();
    return data;
  };

  // Restaurar desde backup (incluyendo hard delete)
  const restoreFromBackup = async (backupId: string) => {
    const { data, error: restoreError } = await supabase.rpc('universal_restore_from_backup', {
      p_backup_id: backupId,
    });

    if (restoreError) throw restoreError;
    if (data && !data.success) throw new Error(data.error || 'Error al restaurar');

    await fetchTrash();
    return data;
  };

  // Restaurar múltiples items
  const restoreMultiple = async (items: Array<{ tableName: string; recordId: string }>) => {
    const results = await Promise.all(
      items.map(({ tableName, recordId }) =>
        restoreFromTrash(tableName, recordId).catch(err => ({
          success: false,
          error: err.message,
          tableName,
          recordId,
        }))
      )
    );
    return results;
  };

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  // Agrupar items por tabla
  const itemsByTable = items.reduce((acc, item) => {
    if (!acc[item.table_name]) {
      acc[item.table_name] = [];
    }
    acc[item.table_name].push(item);
    return acc;
  }, {} as Record<string, TrashItem[]>);

  return {
    items,
    itemsByTable,
    stats,
    loading,
    error,
    refetch: fetchTrash,
    restoreFromTrash,
    restoreFromBackup,
    restoreMultiple,
    totalCount: items.length,
    getTableLabel,
  };
}

/**
 * Hook específico para papelera de contenido
 */
export function useContentTrashUnified() {
  return usePlatformTrash({ tableName: 'content' });
}

/**
 * Hook específico para papelera de clientes
 */
export function useClientsTrash() {
  return usePlatformTrash({ tableName: 'clients' });
}

/**
 * Hook específico para papelera de productos
 */
export function useProductsTrash() {
  return usePlatformTrash({ tableName: 'products' });
}
