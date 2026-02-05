import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Content, ContentStatus } from '@/types/database';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { updateContentStatusWithUP } from '@/hooks/useContentStatusWithUP';

// Global set to track content IDs recently updated by the current session
// This prevents realtime events from triggering unnecessary refetches
const recentLocalUpdates = new Set<string>();
const localUpdateTimers = new Map<string, ReturnType<typeof setTimeout>>();
const LOCAL_UPDATE_DEBOUNCE_MS = 3000;

// Helper to mark a content as recently updated locally
// Exported so other hooks (like useContentDetail) can use it
// durationMs allows extending the window for long operations like video encoding
export function markLocalUpdate(contentId: string, durationMs: number = LOCAL_UPDATE_DEBOUNCE_MS) {
  recentLocalUpdates.add(contentId);
  // Clear any existing timer for this content before setting a new one
  const existingTimer = localUpdateTimers.get(contentId);
  if (existingTimer) clearTimeout(existingTimer);
  const timer = setTimeout(() => {
    recentLocalUpdates.delete(contentId);
    localUpdateTimers.delete(contentId);
  }, durationMs);
  localUpdateTimers.set(contentId, timer);
}

// Helper to check if we should skip realtime refetch for this content
function shouldSkipRealtimeRefetch(contentId?: string): boolean {
  if (!contentId) return false;
  return recentLocalUpdates.has(contentId);
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

  const fetchContent = useCallback(async () => {
    // Wait for org context to resolve before fetching
    if (orgLoading) return;

    try {
      setLoading(true);
      let query = supabase
        .from('content')
        .select(`
          *,
          client:clients(id,name,logo_url)
        `)
        .order('created_at', { ascending: false });

      // Filter by organization - always apply when org is selected (including for root)
      if (currentOrgId) {
        query = query.eq('organization_id', currentOrgId);
      }

      if (role === 'creator' && userId) {
        query = query.eq('creator_id', userId);
      } else if (role === 'editor' && userId) {
        query = query.eq('editor_id', userId);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;
      
      // Obtener perfiles de creadores y editores
      const contentData = data || [];
      const creatorIds = [...new Set(contentData.filter(c => c.creator_id).map(c => c.creator_id))];
      const editorIds = [...new Set(contentData.filter(c => c.editor_id).map(c => c.editor_id))];
      
      let creatorMap = new Map();
      let editorMap = new Map();
      
      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorIds);
        creators?.forEach(c => creatorMap.set(c.id, c));
      }
      
      if (editorIds.length > 0) {
        const { data: editors } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', editorIds);
        editors?.forEach(e => editorMap.set(e.id, e));
      }
      
      const contentWithProfiles = contentData.map(item => ({
        ...item,
        creator: item.creator_id ? creatorMap.get(item.creator_id) : null,
        editor: item.editor_id ? editorMap.get(item.editor_id) : null
      }));
      
      setContent(contentWithProfiles as unknown as Content[]);
    } catch (err) {
      console.error('Error fetching content:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [userId, role, isPlatformRoot, currentOrgId, orgLoading]);

  const updateContentStatus = async (contentId: string, newStatus: ContentStatus, oldStatus?: ContentStatus) => {
    markLocalUpdate(contentId); // Mark as local update to skip realtime refetch
    // If oldStatus is provided, use UP integration
    if (oldStatus) {
      await updateContentStatusWithUP({
        contentId,
        oldStatus,
        newStatus
      });
    } else {
      // Fetch current status if not provided
      const { data: currentContent } = await supabase
        .from('content')
        .select('status')
        .eq('id', contentId)
        .single();

      if (currentContent) {
        await updateContentStatusWithUP({
          contentId,
          oldStatus: currentContent.status as ContentStatus,
          newStatus
        });
      } else {
        // Fallback to simple update
        const { error } = await supabase
          .from('content')
          .update({ status: newStatus })
          .eq('id', contentId);
        if (error) throw error;
      }
    }
    await fetchContent();
  };

  const updateContent = async (contentId: string, updates: Partial<Content>) => {
    markLocalUpdate(contentId); // Mark as local update to skip realtime refetch
    const { error } = await supabase
      .from('content')
      .update(updates)
      .eq('id', contentId);

    if (error) throw error;
    await fetchContent();
  };

  const deleteContent = async (contentId: string) => {
    markLocalUpdate(contentId); // Mark as local update to skip realtime refetch
    const { error } = await supabase
      .from('content')
      .delete()
      .eq('id', contentId);

    if (error) throw error;
    await fetchContent();
  };

  const approveContent = async (contentId: string, approverId: string) => {
    markLocalUpdate(contentId); // Mark as local update to skip realtime refetch
    // First, fetch current status for UP integration
    const { data: currentContent } = await supabase
      .from('content')
      .select('status')
      .eq('id', contentId)
      .single();

    if (currentContent) {
      // Use UP-aware status change
      await updateContentStatusWithUP({
        contentId,
        oldStatus: currentContent.status as ContentStatus,
        newStatus: 'approved'
      });
    }

    // Update approved_by separately
    const { error } = await supabase
      .from('content')
      .update({ approved_by: approverId })
      .eq('id', contentId);

    if (error) throw error;
    await fetchContent();
  };

  const approveScript = async (contentId: string, approverId: string) => {
    markLocalUpdate(contentId); // Mark as local update to skip realtime refetch
    const { error } = await supabase
      .from('content')
      .update({
        status: 'script_approved' as ContentStatus,
        script_approved_at: new Date().toISOString(),
        script_approved_by: approverId
      })
      .eq('id', contentId);

    if (error) throw error;
    await fetchContent();
  };

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Realtime subscription for automatic sync
  // Uses debouncing to avoid refetching when local updates trigger realtime events
  useEffect(() => {
    if (!currentOrgId) return;

    const channel = supabase
      .channel('content-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content',
          filter: `organization_id=eq.${currentOrgId}`
        },
        (payload) => {
          const contentId = (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id;
          // Skip refetch if this was a local update (prevents dialog closing during autoSave)
          if (shouldSkipRealtimeRefetch(contentId)) {
            console.log('[Realtime] Skipping refetch for local update:', payload.eventType, contentId);
            return;
          }
          console.log('[Realtime] Content change from another user:', payload.eventType);
          fetchContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrgId, fetchContent]);

  return {
    content,
    loading,
    error,
    refetch: fetchContent,
    updateContentStatus,
    updateContent,
    deleteContent,
    approveContent,
    approveScript
  };
}

// Hook para usar con filtros más avanzados
export function useContentWithFilters(options: UseContentOptions = {}) {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isPlatformRoot, currentOrgId, loading: orgLoading } = useOrgOwner();

  const fetchContent = useCallback(async () => {
    // Wait for org context to resolve before fetching
    if (orgLoading) return;

    try {
      setLoading(true);
      let query = supabase
        .from('content')
        .select(`
          *,
          client:clients(id,name,logo_url)
        `)
        .order('created_at', { ascending: false });

      // Filter by organization - always apply when org is selected (including for root)
      if (currentOrgId) {
        query = query.eq('organization_id', currentOrgId);
      }

      // Aplicar filtros
      if (options.clientId) {
        query = query.eq('client_id', options.clientId);
      }
      if (options.creatorId) {
        query = query.eq('creator_id', options.creatorId);
      }
      if (options.editorId) {
        query = query.eq('editor_id', options.editorId);
      }

      // Filtro por rol
      if (options.role === 'creator' && options.userId) {
        query = query.eq('creator_id', options.userId);
      } else if (options.role === 'editor' && options.userId) {
        query = query.eq('editor_id', options.userId);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Obtener perfiles de creadores y editores
      const contentData = data || [];
      const creatorIds = [
        ...new Set(contentData.filter((c) => c.creator_id).map((c) => c.creator_id)),
      ];
      const editorIds = [
        ...new Set(contentData.filter((c) => c.editor_id).map((c) => c.editor_id)),
      ];

      let creatorMap = new Map();
      let editorMap = new Map();

      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorIds);
        creators?.forEach((c) => creatorMap.set(c.id, c));
      }

      if (editorIds.length > 0) {
        const { data: editors } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', editorIds);
        editors?.forEach((e) => editorMap.set(e.id, e));
      }

      const contentWithProfiles = contentData.map((item) => ({
        ...item,
        creator: item.creator_id ? creatorMap.get(item.creator_id) : null,
        editor: item.editor_id ? editorMap.get(item.editor_id) : null,
      }));

      setContent(contentWithProfiles as unknown as Content[]);
    } catch (err) {
      console.error('Error fetching content:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [options.userId, options.role, options.clientId, options.creatorId, options.editorId, options.showOnlyAssigned, isPlatformRoot, currentOrgId, orgLoading]);

  const updateContentStatus = async (contentId: string, newStatus: ContentStatus, oldStatus?: ContentStatus) => {
    markLocalUpdate(contentId); // Mark as local update to skip realtime refetch
    // If oldStatus is provided, use UP integration
    if (oldStatus) {
      await updateContentStatusWithUP({
        contentId,
        oldStatus,
        newStatus
      });
    } else {
      // Fetch current status if not provided
      const { data: currentContent } = await supabase
        .from('content')
        .select('status')
        .eq('id', contentId)
        .single();

      if (currentContent) {
        await updateContentStatusWithUP({
          contentId,
          oldStatus: currentContent.status as ContentStatus,
          newStatus
        });
      } else {
        // Fallback to simple update
        const { error } = await supabase
          .from('content')
          .update({ status: newStatus })
          .eq('id', contentId);
        if (error) throw error;
      }
    }
    await fetchContent();
  };

  const deleteContent = async (contentId: string) => {
    markLocalUpdate(contentId); // Mark as local update to skip realtime refetch
    const { error } = await supabase
      .from('content')
      .delete()
      .eq('id', contentId);

    if (error) throw error;
    await fetchContent();
  };

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Realtime subscription for automatic sync
  // Uses debouncing to avoid refetching when local updates trigger realtime events
  useEffect(() => {
    if (!currentOrgId) return;

    const channel = supabase
      .channel('content-changes-filtered')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content',
          filter: `organization_id=eq.${currentOrgId}`
        },
        (payload) => {
          const contentId = (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id;
          // Skip refetch if this was a local update (prevents dialog closing during autoSave)
          if (shouldSkipRealtimeRefetch(contentId)) {
            console.log('[Realtime] Skipping refetch for local update (filtered):', payload.eventType, contentId);
            return;
          }
          console.log('[Realtime] Content change from another user (filtered):', payload.eventType);
          fetchContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrgId, fetchContent]);

  return {
    content,
    loading,
    error,
    refetch: fetchContent,
    updateContentStatus,
    deleteContent
  };
}
