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

// Default page size for content queries to prevent statement timeouts
const CONTENT_PAGE_SIZE = 500;

// Cooldown after errors before realtime can trigger refetches (30s)
const ERROR_COOLDOWN_MS = 30_000;

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

// Shared helper: fetch content without JOIN (avoids RLS timeout on clients table)
// Client info is loaded separately in a lightweight query
async function fetchContentData(opts: {
  currentOrgId?: string;
  role?: string;
  userId?: string;
  clientId?: string;
  creatorId?: string;
  editorId?: string;
}) {
  // Main content query - NO JOIN to clients (avoids RLS timeout)
  let query = supabase
    .from('content')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(CONTENT_PAGE_SIZE);

  if (opts.currentOrgId) query = query.eq('organization_id', opts.currentOrgId);
  if (opts.clientId) query = query.eq('client_id', opts.clientId);
  if (opts.creatorId) query = query.eq('creator_id', opts.creatorId);
  if (opts.editorId) query = query.eq('editor_id', opts.editorId);
  if (opts.role === 'creator' && opts.userId) query = query.eq('creator_id', opts.userId);
  else if (opts.role === 'editor' && opts.userId) query = query.eq('editor_id', opts.userId);

  const { data, error } = await query;
  if (error) throw error;

  const contentData = data || [];

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
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastErrorTimeRef = useRef<number>(0);

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

  const updateContentStatus = async (contentId: string, newStatus: ContentStatus, oldStatus?: ContentStatus) => {
    markLocalUpdate(contentId);
    if (oldStatus) {
      await updateContentStatusWithUP({ contentId, oldStatus, newStatus });
    } else {
      const { data: currentContent, error: contentErr } = await supabase
        .from('content').select('status').eq('id', contentId).single();
      if (contentErr) throw contentErr;
      if (currentContent) {
        await updateContentStatusWithUP({ contentId, oldStatus: currentContent.status as ContentStatus, newStatus });
      } else {
        const { error } = await supabase.from('content').update({ status: newStatus }).eq('id', contentId);
        if (error) throw error;
      }
    }
    await fetchContent();
  };

  const updateContent = async (contentId: string, updates: Partial<Content>) => {
    markLocalUpdate(contentId);
    const { error } = await supabase.from('content').update(updates).eq('id', contentId);
    if (error) throw error;
    await fetchContent();
  };

  const deleteContent = async (contentId: string) => {
    markLocalUpdate(contentId);
    const { error } = await supabase.from('content').delete().eq('id', contentId);
    if (error) throw error;
    await fetchContent();
  };

  const approveContent = async (contentId: string, approverId: string) => {
    markLocalUpdate(contentId);
    const { data: currentContent, error: approveErr } = await supabase
      .from('content').select('status').eq('id', contentId).single();
    if (approveErr) throw approveErr;
    if (currentContent) {
      await updateContentStatusWithUP({ contentId, oldStatus: currentContent.status as ContentStatus, newStatus: 'approved' });
    }
    const { error } = await supabase.from('content').update({ approved_by: approverId }).eq('id', contentId);
    if (error) throw error;
    await fetchContent();
  };

  const approveScript = async (contentId: string, approverId: string) => {
    markLocalUpdate(contentId);
    const { error } = await supabase
      .from('content')
      .update({ status: 'script_approved' as ContentStatus, script_approved_at: new Date().toISOString(), script_approved_by: approverId })
      .eq('id', contentId);
    if (error) throw error;
    await fetchContent();
  };

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Realtime subscription with debounce and error cooldown
  useEffect(() => {
    if (!currentOrgId) return;

    const channel = supabase
      .channel('content-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content', filter: `organization_id=eq.${currentOrgId}` },
        (payload) => {
          const contentId = (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id;
          if (shouldSkipRealtimeRefetch(contentId)) return;
          // Cooldown: skip realtime refetch for 30s after an error
          if (lastErrorTimeRef.current > 0 && Date.now() - lastErrorTimeRef.current < ERROR_COOLDOWN_MS) return;
          if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
          realtimeDebounceRef.current = setTimeout(() => fetchContent(), 3000);
        }
      )
      .subscribe();

    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [currentOrgId, fetchContent]);

  return { content, loading, error, refetch: fetchContent, updateContentStatus, updateContent, deleteContent, approveContent, approveScript };
}

// Hook para usar con filtros más avanzados
export function useContentWithFilters(options: UseContentOptions = {}) {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isPlatformRoot, currentOrgId, loading: orgLoading } = useOrgOwner();
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastErrorTimeRef = useRef<number>(0);

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

  const updateContentStatus = async (contentId: string, newStatus: ContentStatus, oldStatus?: ContentStatus) => {
    markLocalUpdate(contentId);
    if (oldStatus) {
      await updateContentStatusWithUP({ contentId, oldStatus, newStatus });
    } else {
      const { data: currentContent, error: statusErr } = await supabase
        .from('content').select('status').eq('id', contentId).single();
      if (statusErr) throw statusErr;
      if (currentContent) {
        await updateContentStatusWithUP({ contentId, oldStatus: currentContent.status as ContentStatus, newStatus });
      } else {
        const { error } = await supabase.from('content').update({ status: newStatus }).eq('id', contentId);
        if (error) throw error;
      }
    }
    await fetchContent();
  };

  const deleteContent = async (contentId: string) => {
    markLocalUpdate(contentId);
    const { error } = await supabase.from('content').delete().eq('id', contentId);
    if (error) throw error;
    await fetchContent();
  };

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Realtime subscription with debounce and error cooldown
  useEffect(() => {
    if (!currentOrgId) return;

    const channel = supabase
      .channel('content-changes-filtered')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content', filter: `organization_id=eq.${currentOrgId}` },
        (payload) => {
          const contentId = (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id;
          if (shouldSkipRealtimeRefetch(contentId)) return;
          if (lastErrorTimeRef.current > 0 && Date.now() - lastErrorTimeRef.current < ERROR_COOLDOWN_MS) return;
          if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
          realtimeDebounceRef.current = setTimeout(() => fetchContent(), 3000);
        }
      )
      .subscribe();

    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [currentOrgId, fetchContent]);

  return { content, loading, error, refetch: fetchContent, updateContentStatus, deleteContent };
}
