import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgOwner } from '@/hooks/useOrgOwner';

export interface TrashItem {
  id: string;
  title: string;
  deleted_at: string;
  deleted_by: string | null;
  deleted_by_name?: string;
  deletion_reason: string | null;
  client_id: string | null;
  client_name?: string;
  backup_id?: string;
  organization_id: string;
}

export interface ContentBackup {
  id: string;
  content_id: string;
  content_title: string;
  backup_type: 'soft_delete' | 'hard_delete' | 'manual' | 'auto';
  backed_up_at: string;
  backed_up_by: string | null;
  backed_up_by_name?: string;
  content_status: 'hard_deleted' | 'in_trash' | 'active';
  organization_id: string;
}

/**
 * Hook para manejar la papelera de contenido
 * Permite ver contenido eliminado (soft delete) y restaurarlo
 */
export function useContentTrash() {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentOrgId, loading: orgLoading } = useOrgOwner();

  const fetchTrash = useCallback(async () => {
    if (orgLoading || !currentOrgId) return;

    try {
      setLoading(true);

      // Obtener contenido en papelera de la organización actual
      const { data, error: fetchError } = await supabase
        .from('content')
        .select(`
          id,
          title,
          deleted_at,
          deleted_by,
          deletion_reason,
          client_id,
          organization_id,
          clients:client_id (name),
          deleted_by_profile:deleted_by (full_name)
        `)
        .eq('organization_id', currentOrgId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (fetchError) throw fetchError;

      const items: TrashItem[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        deleted_at: item.deleted_at,
        deleted_by: item.deleted_by,
        deleted_by_name: item.deleted_by_profile?.full_name || null,
        deletion_reason: item.deletion_reason,
        client_id: item.client_id,
        client_name: item.clients?.name || null,
        organization_id: item.organization_id,
      }));

      setTrashItems(items);
      setError(null);
    } catch (err) {
      console.error('Error fetching trash:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar papelera');
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, orgLoading]);

  // Restaurar un item de la papelera
  const restoreItem = async (contentId: string) => {
    const { data, error: restoreError } = await supabase.rpc('restore_content_from_trash', {
      p_content_id: contentId
    });

    if (restoreError) throw restoreError;
    if (data && !data.success) throw new Error(data.error || 'Error al restaurar');

    await fetchTrash();
    return data;
  };

  // Restaurar múltiples items
  const restoreMultiple = async (contentIds: string[]) => {
    const results = await Promise.all(
      contentIds.map(id => restoreItem(id).catch(err => ({ success: false, error: err.message, id })))
    );
    return results;
  };

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  return {
    trashItems,
    loading,
    error,
    refetch: fetchTrash,
    restoreItem,
    restoreMultiple,
    trashCount: trashItems.length,
  };
}

/**
 * Hook para ver backups disponibles (incluyendo hard deletes)
 * Solo para admins
 */
export function useContentBackups() {
  const [backups, setBackups] = useState<ContentBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentOrgId, loading: orgLoading } = useOrgOwner();

  const fetchBackups = useCallback(async () => {
    if (orgLoading || !currentOrgId) return;

    try {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from('content_backup')
        .select(`
          id,
          content_id,
          content_title,
          backup_type,
          backed_up_at,
          backed_up_by,
          organization_id,
          backed_up_by_profile:backed_up_by (full_name)
        `)
        .eq('organization_id', currentOrgId)
        .is('restored_at', null)
        .order('backed_up_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      // Verificar estado actual del contenido
      const contentIds = [...new Set((data || []).map((b: any) => b.content_id))];
      const { data: contentData } = await supabase
        .from('content')
        .select('id, deleted_at')
        .in('id', contentIds);

      const contentMap = new Map((contentData || []).map((c: any) => [c.id, c]));

      const items: ContentBackup[] = (data || []).map((item: any) => {
        const content = contentMap.get(item.content_id);
        let status: 'hard_deleted' | 'in_trash' | 'active' = 'hard_deleted';
        if (content) {
          status = content.deleted_at ? 'in_trash' : 'active';
        }

        return {
          id: item.id,
          content_id: item.content_id,
          content_title: item.content_title,
          backup_type: item.backup_type,
          backed_up_at: item.backed_up_at,
          backed_up_by: item.backed_up_by,
          backed_up_by_name: item.backed_up_by_profile?.full_name || null,
          content_status: status,
          organization_id: item.organization_id,
        };
      });

      setBackups(items);
      setError(null);
    } catch (err) {
      console.error('Error fetching backups:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar backups');
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, orgLoading]);

  // Restaurar desde backup (puede recrear contenido hard deleted)
  const restoreFromBackup = async (backupId: string) => {
    const { data, error: restoreError } = await supabase.rpc('restore_content_from_backup', {
      p_backup_id: backupId
    });

    if (restoreError) throw restoreError;
    if (data && !data.success) throw new Error(data.error || 'Error al restaurar');

    await fetchBackups();
    return data;
  };

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  return {
    backups,
    loading,
    error,
    refetch: fetchBackups,
    restoreFromBackup,
  };
}
