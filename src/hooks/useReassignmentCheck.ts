import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { checkCreatorReassignmentNeeded, checkEditorReassignmentNeeded } from './useUPStatusHandler';

interface ContentForReassignment {
  id: string;
  title: string;
  status: string;
  creator_id: string | null;
  editor_id: string | null;
  recording_at: string | null;
  editing_at: string | null;
  creator_name?: string;
  editor_name?: string;
  days_overdue: number;
  reassignment_type: 'creator' | 'editor';
}

interface UseReassignmentCheckReturn {
  checkContentForReassignment: (organizationId: string) => Promise<ContentForReassignment[]>;
  reassignCreator: (contentId: string, newCreatorId: string) => Promise<boolean>;
  reassignEditor: (contentId: string, newEditorId: string) => Promise<boolean>;
}

export function useReassignmentCheck(): UseReassignmentCheckReturn {
  
  const checkContentForReassignment = useCallback(async (organizationId: string): Promise<ContentForReassignment[]> => {
    const contentNeedingReassignment: ContentForReassignment[] = [];

    try {
      // Get content in recording status
      const { data: recordingContent, error: recordingError } = await supabase
        .from('content')
        .select(`
          id,
          title,
          status,
          creator_id,
          recording_at,
          creator:profiles!content_creator_id_fkey(full_name)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'recording')
        .not('recording_at', 'is', null);

      if (recordingError) throw recordingError;

      // Check each content for creator reassignment
      for (const content of recordingContent || []) {
        if (content.recording_at && checkCreatorReassignmentNeeded(content.recording_at)) {
          const recordingDate = new Date(content.recording_at);
          const now = new Date();
          const daysOverdue = Math.floor((now.getTime() - recordingDate.getTime()) / (1000 * 60 * 60 * 24)) - 6;
          
          contentNeedingReassignment.push({
            id: content.id,
            title: content.title,
            status: content.status || 'recording',
            creator_id: content.creator_id,
            editor_id: null,
            recording_at: content.recording_at,
            editing_at: null,
            creator_name: (content.creator as any)?.full_name || 'Sin nombre',
            days_overdue: Math.max(0, daysOverdue),
            reassignment_type: 'creator'
          });
        }
      }

      // Get content in editing status
      const { data: editingContent, error: editingError } = await supabase
        .from('content')
        .select(`
          id,
          title,
          status,
          editor_id,
          editing_at,
          editor:profiles!content_editor_id_fkey(full_name)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'editing')
        .not('editing_at', 'is', null);

      if (editingError) throw editingError;

      // Check each content for editor reassignment
      for (const content of editingContent || []) {
        if (content.editing_at && checkEditorReassignmentNeeded(content.editing_at)) {
          const editingDate = new Date(content.editing_at);
          const now = new Date();
          const daysOverdue = Math.floor((now.getTime() - editingDate.getTime()) / (1000 * 60 * 60 * 24)) - 5;
          
          contentNeedingReassignment.push({
            id: content.id,
            title: content.title,
            status: content.status || 'editing',
            creator_id: null,
            editor_id: content.editor_id,
            recording_at: null,
            editing_at: content.editing_at,
            editor_name: (content.editor as any)?.full_name || 'Sin nombre',
            days_overdue: Math.max(0, daysOverdue),
            reassignment_type: 'editor'
          });
        }
      }

      return contentNeedingReassignment;
    } catch (error) {
      console.error('Error checking content for reassignment:', error);
      return [];
    }
  }, []);

  const reassignCreator = useCallback(async (contentId: string, newCreatorId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('content')
        .update({
          creator_id: newCreatorId,
          recording_at: new Date().toISOString(), // Reset the timer
          creator_assigned_at: new Date().toISOString()
        })
        .eq('id', contentId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error reassigning creator:', error);
      return false;
    }
  }, []);

  const reassignEditor = useCallback(async (contentId: string, newEditorId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('content')
        .update({
          editor_id: newEditorId,
          editing_at: new Date().toISOString(), // Reset the timer
          editor_assigned_at: new Date().toISOString()
        })
        .eq('id', contentId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error reassigning editor:', error);
      return false;
    }
  }, []);

  return {
    checkContentForReassignment,
    reassignCreator,
    reassignEditor
  };
}
