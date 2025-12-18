import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Content, ContentStatus } from '@/types/database';

export function useContent(userId?: string, role?: 'creator' | 'editor' | 'client' | 'admin') {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = async () => {
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
  };

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

  const approveContent = async (contentId: string, userId: string) => {
    const { error } = await supabase
      .from('content')
      .update({ 
        status: 'approved' as ContentStatus,
        approved_at: new Date().toISOString(),
        approved_by: userId
      })
      .eq('id', contentId);

    if (error) throw error;
    await fetchContent();
  };

  useEffect(() => {
    fetchContent();
  }, [userId, role]);

  return {
    content,
    loading,
    error,
    refetch: fetchContent,
    updateContentStatus,
    updateContent,
    approveContent
  };
}
