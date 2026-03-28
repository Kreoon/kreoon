import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Content, ContentStatus } from '@/types/database';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { updateContentStatusWithUP } from '@/hooks/useContentStatusWithUP';
import { useRealtimeContent } from '@/hooks/realtime/useRealtimeContent';
import { markLocalUpdate as markLocalUpdateNew } from '@/hooks/realtime/useRealtimeDebounce';
import type { ProfileCache } from '@/hooks/realtime/types';

// Default page size for content queries to prevent statement timeouts
const CONTENT_PAGE_SIZE = 500;

// Re-export markLocalUpdate from new module for backward compatibility
// This allows other hooks (like useContentDetail) to continue using it
export function markLocalUpdate(contentId: string, durationMs: number = 3000) {
  markLocalUpdateNew(contentId, ['*'], durationMs);
}

// Shared helper: fetch content via SECURITY DEFINER RPC (bypasses 18 RLS policies)
// Falls back to direct query if no org context (rare case)
async function fetchContentData(opts: {
  currentOrgId?: string;
  role?: string;
  userId?: string;
  clientId?: string;
  creatorId?: string;
  editorId?: string;
}) {
  let contentData: any[] = [];

  if (opts.currentOrgId) {
    // Use RPC function - checks membership ONCE instead of 18 RLS policies per row
    const { data, error } = await supabase.rpc('get_org_content', {
      p_organization_id: opts.currentOrgId,
      p_role: opts.role || null,
      p_user_id: opts.userId || null,
      p_client_id: opts.clientId || null,
      p_creator_id: opts.creatorId || null,
      p_editor_id: opts.editorId || null,
      p_limit: CONTENT_PAGE_SIZE,
    });
    if (error) throw error;
    contentData = data || [];
  } else {
    // Fallback: direct query (only when no org context)
    let query = supabase
      .from('content')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(CONTENT_PAGE_SIZE);
    if (opts.clientId) query = query.eq('client_id', opts.clientId);
    if (opts.creatorId) query = query.eq('creator_id', opts.creatorId);
    if (opts.editorId) query = query.eq('editor_id', opts.editorId);
    if (opts.role === 'creator' && opts.userId) query = query.eq('creator_id', opts.userId);
    else if (opts.role === 'editor' && opts.userId) query = query.eq('editor_id', opts.userId);
    const { data, error } = await query;
    if (error) throw error;
    contentData = data || [];
  }

  // Fetch client, creator, editor info in parallel (lightweight individual queries)
  // Each fetch is wrapped in try/catch so a timeout on clients (heavy RLS) won't block everything
  const clientIds = [...new Set(contentData.filter(c => c.client_id).map(c => c.client_id))] as string[];
  const creatorIds = [...new Set(contentData.filter(c => c.creator_id).map(c => c.creator_id))] as string[];
  const editorIds = [...new Set(contentData.filter(c => c.editor_id).map(c => c.editor_id))] as string[];

  const safeFetch = async <T>(fn: () => Promise<{ data: T[] | null; error: any }>): Promise<T[]> => {
    try {
      const res = await fn();
      if (res.error) { console.warn('[useContent] Non-critical fetch error:', res.error); return []; }
      return res.data || [];
    } catch (e) { console.warn('[useContent] Non-critical fetch failed:', e); return []; }
  };

  const [clientsData, creatorsData, editorsData] = await Promise.all([
    clientIds.length > 0
      ? safeFetch(() => supabase.from('clients').select('id, name, logo_url').in('id', clientIds))
      : [] as any[],
    creatorIds.length > 0
      ? safeFetch(() => supabase.from('profiles').select('id, full_name').in('id', creatorIds))
      : [] as any[],
    editorIds.length > 0
      ? safeFetch(() => supabase.from('profiles').select('id, full_name').in('id', editorIds))
      : [] as any[],
  ]);

  const clientMap = new Map(clientsData.map((c: any) => [c.id, c]));
  const creatorMap = new Map(creatorsData.map((c: any) => [c.id, c]));
  const editorMap = new Map(editorsData.map((e: any) => [e.id, e]));

  return contentData.map(item => ({
    ...item,
    client: item.client_id ? clientMap.get(item.client_id) || null : null,
    creator: item.creator_id ? creatorMap.get(item.creator_id) || null : null,
    editor: item.editor_id ? editorMap.get(item.editor_id) || null : null,
  }));
}

interface UseContentOptions {
  userId?: string;
  role?: 'creator' | 'editor' | 'client' | 'admin' | 'strategist';
  clientId?: string;
  creatorId?: string;
  editorId?: string;
  organizationId?: string;
  /** Para creator/editor: cuando false, muestra todo el contenido de la org (no solo asignado). Default: true */
  showOnlyAssigned?: boolean;
}

export function useContent(userId?: string, role?: 'creator' | 'editor' | 'client' | 'admin') {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isPlatformRoot, currentOrgId, loading: orgLoading } = useOrgOwner();
  const lastErrorTimeRef = useRef<number>(0);

  // Cache de profiles para enriquecimiento en realtime
  const profileCacheRef = useRef<ProfileCache>({
    clients: new Map(),
    creators: new Map(),
    editors: new Map(),
  });

  const fetchContent = useCallback(async () => {
    // Wait for org context to resolve before fetching
    if (orgLoading) return;

    try {
      setLoading(true);
      const result = await fetchContentData({
        currentOrgId: currentOrgId || undefined,
        role,
        userId,
      });

      // Actualizar cache de profiles con los datos enriquecidos
      for (const item of result) {
        if (item.client && item.client_id) {
          profileCacheRef.current.clients.set(item.client_id, item.client);
        }
        if (item.creator && item.creator_id) {
          profileCacheRef.current.creators.set(item.creator_id, item.creator);
        }
        if (item.editor && item.editor_id) {
          profileCacheRef.current.editors.set(item.editor_id, item.editor);
        }
      }

      setContent(result as unknown as Content[]);
      setError(null);
      lastErrorTimeRef.current = 0;
    } catch (err) {
      console.error('Error fetching content:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      lastErrorTimeRef.current = Date.now();
    } finally {
      setLoading(false);
    }
  }, [userId, role, isPlatformRoot, currentOrgId, orgLoading]);

  // Handler para cambios realtime - actualiza state sin refetch completo
  const handleRealtimeChange = useCallback((updater: (current: Content[]) => Content[]) => {
    setContent(updater);
  }, []);

  // Suscripción realtime para sincronización entre usuarios
  useRealtimeContent({
    organizationId: currentOrgId,
    enabled: !orgLoading && !!currentOrgId,
    onContentChange: handleRealtimeChange,
    profileCache: profileCacheRef.current,
  });

  const updateContentStatus = async (contentId: string, newStatus: ContentStatus, oldStatus?: ContentStatus) => {
    markLocalUpdate(contentId);

    // Optimistic update - actualiza UI inmediatamente
    setContent(prev => prev.map(c =>
      c.id === contentId ? { ...c, status: newStatus, updated_at: new Date().toISOString() } : c
    ));

    try {
      if (oldStatus) {
        await updateContentStatusWithUP({ contentId, oldStatus, newStatus });
      } else {
        // Fetch current status via RPC (bypasses 18 RLS policies)
        const { data: contentArr, error: contentErr } = await supabase
          .rpc('get_content_by_id', { p_content_id: contentId });
        if (contentErr) throw contentErr;
        const currentContent = contentArr?.[0];
        if (currentContent) {
          await updateContentStatusWithUP({ contentId, oldStatus: currentContent.status as ContentStatus, newStatus });
        } else {
          await supabase.rpc('update_content_by_id', { p_content_id: contentId, p_updates: { status: newStatus } });
        }
      }
    } catch (err) {
      // Rollback en caso de error
      console.error('Error updating status:', err);
      await fetchContent();
      throw err;
    }
  };

  const updateContent = async (contentId: string, updates: Partial<Content>) => {
    markLocalUpdate(contentId);

    // Optimistic update
    setContent(prev => prev.map(c =>
      c.id === contentId ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
    ));

    try {
      const { error } = await supabase.rpc('update_content_by_id', { p_content_id: contentId, p_updates: updates as any });
      if (error) throw error;
    } catch (err) {
      // Rollback en caso de error
      console.error('Error updating content:', err);
      await fetchContent();
      throw err;
    }
  };

  const deleteContent = async (contentId: string, reason?: string) => {
    markLocalUpdate(contentId);

    // Guardar item para posible rollback
    const deletedItem = content.find(c => c.id === contentId);

    // Optimistic update - remover de la lista
    setContent(prev => prev.filter(c => c.id !== contentId));

    try {
      // Usar soft delete - mueve a papelera en lugar de eliminar permanentemente
      const { data, error } = await supabase.rpc('soft_delete_content', {
        p_content_id: contentId,
        p_reason: reason || null
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Error al eliminar');
    } catch (err) {
      // Rollback - restaurar item eliminado
      if (deletedItem) {
        setContent(prev => [deletedItem, ...prev]);
      }
      throw err;
    }
  };

  // Restaurar contenido desde papelera
  const restoreContent = async (contentId: string) => {
    markLocalUpdate(contentId);
    const { data, error } = await supabase.rpc('restore_content_from_trash', {
      p_content_id: contentId
    });
    if (error) throw error;
    if (data && !data.success) throw new Error(data.error || 'Error al restaurar');
    // Refetch necesario porque el item no está en el state actual
    await fetchContent();
  };

  const approveContent = async (contentId: string, approverId: string) => {
    markLocalUpdate(contentId);

    // Optimistic update
    setContent(prev => prev.map(c =>
      c.id === contentId ? { ...c, status: 'approved' as ContentStatus, approved_by: approverId, updated_at: new Date().toISOString() } : c
    ));

    try {
      // Fetch current status via RPC (bypasses 18 RLS policies)
      const { data: contentArr, error: approveErr } = await supabase
        .rpc('get_content_by_id', { p_content_id: contentId });
      if (approveErr) throw approveErr;
      const currentContent = contentArr?.[0];
      if (currentContent) {
        await updateContentStatusWithUP({ contentId, oldStatus: currentContent.status as ContentStatus, newStatus: 'approved' });
      }
      await supabase.rpc('update_content_by_id', { p_content_id: contentId, p_updates: { approved_by: approverId } });
    } catch (err) {
      console.error('Error approving content:', err);
      await fetchContent();
      throw err;
    }
  };

  const approveScript = async (contentId: string, approverId: string) => {
    markLocalUpdate(contentId);

    // Optimistic update
    const now = new Date().toISOString();
    setContent(prev => prev.map(c =>
      c.id === contentId ? { ...c, status: 'script_approved' as ContentStatus, script_approved_at: now, script_approved_by: approverId, updated_at: now } : c
    ));

    try {
      const { error } = await supabase.rpc('update_content_by_id', {
        p_content_id: contentId,
        p_updates: { status: 'script_approved', script_approved_at: now, script_approved_by: approverId }
      });
      if (error) throw error;
    } catch (err) {
      console.error('Error approving script:', err);
      await fetchContent();
      throw err;
    }
  };

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return { content, loading, error, refetch: fetchContent, updateContentStatus, updateContent, deleteContent, restoreContent, approveContent, approveScript };
}

// Hook para usar con filtros más avanzados
export function useContentWithFilters(options: UseContentOptions = {}) {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isPlatformRoot, currentOrgId, loading: orgLoading } = useOrgOwner();
  const lastErrorTimeRef = useRef<number>(0);

  // Cache de profiles para enriquecimiento en realtime
  const profileCacheRef = useRef<ProfileCache>({
    clients: new Map(),
    creators: new Map(),
    editors: new Map(),
  });

  const fetchContent = useCallback(async () => {
    if (orgLoading) return;

    try {
      setLoading(true);
      const result = await fetchContentData({
        currentOrgId: currentOrgId || undefined,
        role: options.role,
        userId: options.userId,
        clientId: options.clientId,
        creatorId: options.creatorId,
        editorId: options.editorId,
      });

      // Actualizar cache de profiles
      for (const item of result) {
        if (item.client && item.client_id) {
          profileCacheRef.current.clients.set(item.client_id, item.client);
        }
        if (item.creator && item.creator_id) {
          profileCacheRef.current.creators.set(item.creator_id, item.creator);
        }
        if (item.editor && item.editor_id) {
          profileCacheRef.current.editors.set(item.editor_id, item.editor);
        }
      }

      setContent(result as unknown as Content[]);
      setError(null);
      lastErrorTimeRef.current = 0;
    } catch (err) {
      console.error('Error fetching content:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      lastErrorTimeRef.current = Date.now();
    } finally {
      setLoading(false);
    }
  }, [options.userId, options.role, options.clientId, options.creatorId, options.editorId, options.showOnlyAssigned, isPlatformRoot, currentOrgId, orgLoading]);

  // Handler para cambios realtime
  const handleRealtimeChange = useCallback((updater: (current: Content[]) => Content[]) => {
    setContent(updater);
  }, []);

  // Suscripción realtime para sincronización entre usuarios
  useRealtimeContent({
    organizationId: currentOrgId,
    enabled: !orgLoading && !!currentOrgId,
    onContentChange: handleRealtimeChange,
    profileCache: profileCacheRef.current,
  });

  const updateContentStatus = async (contentId: string, newStatus: ContentStatus, oldStatus?: ContentStatus) => {
    markLocalUpdate(contentId);

    // Optimistic update
    setContent(prev => prev.map(c =>
      c.id === contentId ? { ...c, status: newStatus, updated_at: new Date().toISOString() } : c
    ));

    try {
      if (oldStatus) {
        await updateContentStatusWithUP({ contentId, oldStatus, newStatus });
      } else {
        const { data: contentArr, error: statusErr } = await supabase
          .rpc('get_content_by_id', { p_content_id: contentId });
        if (statusErr) throw statusErr;
        const currentContent = contentArr?.[0];
        if (currentContent) {
          await updateContentStatusWithUP({ contentId, oldStatus: currentContent.status as ContentStatus, newStatus });
        } else {
          await supabase.rpc('update_content_by_id', { p_content_id: contentId, p_updates: { status: newStatus } });
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
      await fetchContent();
      throw err;
    }
  };

  const deleteContent = async (contentId: string, reason?: string) => {
    markLocalUpdate(contentId);

    const deletedItem = content.find(c => c.id === contentId);
    setContent(prev => prev.filter(c => c.id !== contentId));

    try {
      const { data, error } = await supabase.rpc('soft_delete_content', {
        p_content_id: contentId,
        p_reason: reason || null
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Error al eliminar');
    } catch (err) {
      if (deletedItem) {
        setContent(prev => [deletedItem, ...prev]);
      }
      throw err;
    }
  };

  const restoreContent = async (contentId: string) => {
    markLocalUpdate(contentId);
    const { data, error } = await supabase.rpc('restore_content_from_trash', {
      p_content_id: contentId
    });
    if (error) throw error;
    if (data && !data.success) throw new Error(data.error || 'Error al restaurar');
    await fetchContent();
  };

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return { content, loading, error, refetch: fetchContent, updateContentStatus, deleteContent, restoreContent };
}
