import { supabase } from '@/integrations/supabase/client';
import { ContentStatus } from '@/types/database';
import { handleUPStatusChange } from './useUPStatusHandler';

interface StatusChangeParams {
  contentId: string;
  oldStatus: ContentStatus;
  newStatus: ContentStatus;
}

/**
 * Centralized hook for handling content status changes with UP points integration
 */
export async function updateContentStatusWithUP(params: StatusChangeParams) {
  const { contentId, oldStatus, newStatus } = params;
  
  // First, fetch the content to get all required data
  const { data: content, error: fetchError } = await supabase
    .from('content')
    .select(`
      id,
      organization_id,
      creator_id,
      editor_id,
      recording_at,
      recorded_at,
      editing_at,
      delivered_at,
      issue_at,
      approved_at
    `)
    .eq('id', contentId)
    .single();

  if (fetchError || !content) {
    console.error('Error fetching content for UP:', fetchError);
    throw fetchError;
  }

  // Build update object based on the new status
  const updates: Record<string, any> = {
    status: newStatus
  };

  const now = new Date().toISOString();

  // Set timestamps based on status transitions
  switch (newStatus) {
    case 'recording':
      updates.recording_at = now;
      break;
    case 'recorded':
      updates.recorded_at = now;
      break;
    case 'editing':
      updates.editing_at = now;
      break;
    case 'delivered':
      updates.delivered_at = now;
      break;
    case 'issue':
      updates.issue_at = now;
      break;
    case 'corrected':
      updates.corrected_at = now;
      break;
    case 'approved':
      updates.approved_at = now;
      break;
    case 'paid':
      updates.paid_at = now;
      break;
  }

  // Update the content status
  const { error: updateError } = await supabase
    .from('content')
    .update(updates)
    .eq('id', contentId);

  if (updateError) {
    throw updateError;
  }

  // Handle UP points
  if (content.organization_id) {
    try {
      await handleUPStatusChange({
        contentId,
        organizationId: content.organization_id,
        oldStatus,
        newStatus,
        creatorId: content.creator_id,
        editorId: content.editor_id,
        recordingAt: content.recording_at || updates.recording_at,
        recordedAt: updates.recorded_at || content.recorded_at,
        editingAt: content.editing_at || updates.editing_at,
        deliveredAt: updates.delivered_at || content.delivered_at,
        issueAt: updates.issue_at || content.issue_at,
        approvedAt: updates.approved_at || content.approved_at
      });
    } catch (upError) {
      // Log but don't fail the status change
      console.error('Error handling UP points:', upError);
    }
  }

  return { success: true };
}

/**
 * Simple status update without UP (for cases where UP is not applicable)
 */
export async function updateContentStatusSimple(contentId: string, newStatus: ContentStatus) {
  const updates: Record<string, any> = {
    status: newStatus
  };

  const now = new Date().toISOString();

  // Set timestamps based on status
  switch (newStatus) {
    case 'recording':
      updates.recording_at = now;
      break;
    case 'recorded':
      updates.recorded_at = now;
      break;
    case 'editing':
      updates.editing_at = now;
      break;
    case 'delivered':
      updates.delivered_at = now;
      break;
    case 'corrected':
      updates.corrected_at = now;
      break;
    case 'approved':
      updates.approved_at = now;
      break;
    case 'paid':
      updates.paid_at = now;
      break;
  }

  const { error } = await supabase
    .from('content')
    .update(updates)
    .eq('id', contentId);

  if (error) throw error;
}
