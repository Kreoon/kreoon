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
  
  console.log('[ContentStatusWithUP] Starting status change:', { contentId, oldStatus, newStatus });
  
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
      approved_at,
      corrected_at
    `)
    .eq('id', contentId)
    .single();

  if (fetchError || !content) {
    console.error('[ContentStatusWithUP] Error fetching content for UP:', fetchError);
    throw fetchError;
  }

  console.log('[ContentStatusWithUP] Content fetched:', {
    creator_id: content.creator_id,
    editor_id: content.editor_id,
    recording_at: content.recording_at,
    editing_at: content.editing_at
  });

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
    console.error('[ContentStatusWithUP] Error updating content:', updateError);
    throw updateError;
  }

  console.log('[ContentStatusWithUP] Content status updated to:', newStatus);

  // Handle UP points
  if (content.organization_id) {
    try {
      // Build the parameters with the updated timestamps
      const upParams = {
        contentId,
        organizationId: content.organization_id,
        oldStatus,
        newStatus,
        creatorId: content.creator_id,
        editorId: content.editor_id,
        // For recording_at: use existing or new value
        recordingAt: newStatus === 'recording' ? now : content.recording_at,
        // For recorded_at: use new value if transitioning to recorded, else existing
        recordedAt: newStatus === 'recorded' ? now : content.recorded_at,
        // For editing_at: use existing or new value
        editingAt: newStatus === 'editing' ? now : content.editing_at,
        // For delivered_at: use new value if transitioning to delivered, else existing
        deliveredAt: newStatus === 'delivered' ? now : content.delivered_at,
        // For issue_at: use new value if transitioning to issue, else existing
        issueAt: newStatus === 'issue' ? now : content.issue_at,
        // For approved_at: use new value if transitioning to approved, else existing
        approvedAt: newStatus === 'approved' ? now : content.approved_at
      };

      console.log('[ContentStatusWithUP] Calling handleUPStatusChange with:', upParams);
      
      await handleUPStatusChange(upParams);
      
      console.log('[ContentStatusWithUP] UP points handled successfully');
    } catch (upError) {
      // Log but don't fail the status change
      console.error('[ContentStatusWithUP] Error handling UP points:', upError);
    }
  } else {
    console.log('[ContentStatusWithUP] No organization_id, skipping UP points');
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