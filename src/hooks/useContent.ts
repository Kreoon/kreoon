import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Content, ContentStatus } from '@/types/database';

interface UseContentOptions {
  userId?: string;
  role?: 'creator' | 'editor' | 'client' | 'admin';
  clientId?: string;
  creatorId?: string;
  editorId?: string;
}

export function useContent(userId?: string, role?: 'creator' | 'editor' | 'client' | 'admin') {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('content')
        .select(`
          *,
          client:clients(*),
          creator:profiles!content_creator_id_fkey(*),
          editor:profiles!content_editor_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (role === 'creator' && userId) {
        query = query.eq('creator_id', userId);
      } else if (role === 'editor' && userId) {
        query = query.eq('editor_id', userId);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;
      setContent((data || []) as unknown as Content[]);
    } catch (err) {
      console.error('Error fetching content:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

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
    approveContent,
    approveScript
  };
}

// Hook para usar con filtros más avanzados
export function useContentWithFilters(options: UseContentOptions = {}) {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('content')
        .select(`
          *,
          client:clients(*),
          creator:profiles!content_creator_id_fkey(*),
          editor:profiles!content_editor_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

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
      setContent((data || []) as unknown as Content[]);
    } catch (err) {
      console.error('Error fetching content:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [options.userId, options.role, options.clientId, options.creatorId, options.editorId]);

  const updateContentStatus = async (contentId: string, newStatus: ContentStatus) => {
    const { error } = await supabase
      .from('content')
      .update({ status: newStatus })
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
    updateContentStatus
  };
}
