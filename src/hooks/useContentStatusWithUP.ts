import { supabase } from '@/integrations/supabase/client';
import { ContentStatus } from '@/types/database';
import { handleUPStatusChange } from './useUPStatusHandler';
import { logger } from '@/lib/logger';

interface StatusChangeParams {
  contentId: string;
  oldStatus: ContentStatus;
  newStatus: ContentStatus;
}

/**
 * Actualiza el estado de un contenido en Supabase y dispara la lógica de puntos UP
 * (transiciones de estado que otorgan o penalizan puntos a creador/editor).
 *
 * @param params - contentId, oldStatus y newStatus
 * @throws Error de Supabase si falla el fetch o el update del contenido
 */
export async function updateContentStatusWithUP(params: StatusChangeParams) {
  const { contentId, oldStatus, newStatus } = params;

  logger.debug('ContentStatusWithUP Starting status change', { contentId, oldStatus, newStatus });
  
  // Fetch content via SECURITY DEFINER RPC (bypasses 18 RLS policies)
  const { data: contentArr, error: fetchError } = await supabase
    .rpc('get_content_by_id', { p_content_id: contentId });

  const content = contentArr?.[0];

  if (fetchError || !content) {
    logger.error('ContentStatusWithUP Error fetching content for UP', fetchError);
    throw fetchError || new Error('Content not found');
  }

  logger.debug('ContentStatusWithUP Content fetched', {
    creator_id: content.creator_id,
    editor_id: content.editor_id
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

  // Update via SECURITY DEFINER RPC (bypasses 18 RLS policies)
  const { error: updateError } = await supabase
    .rpc('update_content_by_id', { p_content_id: contentId, p_updates: updates });

  if (updateError) {
    logger.error('ContentStatusWithUP Error updating content', updateError);
    throw updateError;
  }

  logger.debug('ContentStatusWithUP Content status updated', { newStatus });

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

      logger.debug('ContentStatusWithUP Calling handleUPStatusChange');

      await handleUPStatusChange(upParams);

      logger.debug('ContentStatusWithUP UP points handled successfully');
    } catch (upError) {
      // Log but don't fail the status change
      logger.error('ContentStatusWithUP Error handling UP points', upError);
    }
  } else {
    logger.debug('ContentStatusWithUP No organization_id, skipping UP points');
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

  // Update via SECURITY DEFINER RPC (bypasses 18 RLS policies)
  const { error } = await supabase
    .rpc('update_content_by_id', { p_content_id: contentId, p_updates: updates });

  if (error) throw error;
}