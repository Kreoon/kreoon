import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Content, ContentStatus } from '@/types/database';
import { useOrgOwner } from '@/hooks/useOrgOwner';

interface UseContentOptions {
  userId?: string;
  role?: 'creator' | 'editor' | 'client' | 'admin';
  clientId?: string;
  creatorId?: string;
  editorId?: string;
  organizationId?: string;
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
          client:clients(*)
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

  const updateContentStatus = async (contentId: string, newStatus: ContentStatus) => {
    const { error } = await supabase
      .from('content')
      .update({ status: newStatus })
      .eq('id', contentId);

    if (error) throw error;
    await fetchContent();
  };

  const updateContent = async (contentId: string, updates: Partial<Content>) => {
    const { error } = await supabase
      .from('content')
      .update(updates)
      .eq('id', contentId);

    if (error) throw error;
    await fetchContent();
  };

  const deleteContent = async (contentId: string) => {
    const { error } = await supabase
      .from('content')
      .delete()
      .eq('id', contentId);

    if (error) throw error;
    await fetchContent();
  };

  const approveContent = async (contentId: string, approverId: string) => {
    const { error } = await supabase
      .from('content')
      .update({ 
        status: 'approved' as ContentStatus,
        approved_at: new Date().toISOString(),
        approved_by: approverId
      })
      .eq('id', contentId);

    if (error) throw error;
    await fetchContent();
  };

  const approveScript = async (contentId: string, approverId: string) => {
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
          client:clients(*)
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
  }, [options.userId, options.role, options.clientId, options.creatorId, options.editorId, isPlatformRoot, currentOrgId, orgLoading]);

  const updateContentStatus = async (contentId: string, newStatus: ContentStatus) => {
    const { error } = await supabase
      .from('content')
      .update({ status: newStatus })
      .eq('id', contentId);

    if (error) throw error;
    await fetchContent();
  };

  const deleteContent = async (contentId: string) => {
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

  return {
    content,
    loading,
    error,
    refetch: fetchContent,
    updateContentStatus,
    deleteContent
  };
}
