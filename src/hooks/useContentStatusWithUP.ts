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
 * Actualiza el estado de un contenido usando RPC simplificada (sin necesidad de old_status)
 * Esta función no requiere que el cliente haga queries previos - todo se maneja server-side.
 *
 * @param contentId - ID del contenido
 * @param newStatus - Nuevo estado
 * @throws Error de Supabase si falla el update
 */
export async function updateContentStatus(contentId: string, newStatus: ContentStatus) {
  logger.debug('ContentStatus Starting status change', { contentId, newStatus });

  // Use the simplified RPC that doesn't require old_status
  // This bypasses RLS completely and handles everything server-side
  const { data: result, error: rpcError } = await supabase
    .rpc('update_content_status_rpc', {
      p_content_id: contentId,
      p_new_status: newStatus
    });

  if (rpcError) {
    logger.error('ContentStatus RPC error', rpcError);
    throw rpcError;
  }

  if (result && !result.success) {
    logger.error('ContentStatus Function error', result.error);
    throw new Error(result.error || 'Failed to update content status');
  }

  logger.debug('ContentStatus Updated via RPC', {
    oldStatus: result?.old_status,
    newStatus: result?.new_status
  });

  // Handle UP points for Unified Reputation Engine
  if (result?.old_status && result?.new_status && result.old_status !== result.new_status) {
    try {
      const { data: contentArr } = await supabase
        .rpc('get_content_by_id', { p_content_id: contentId });

      const content = contentArr?.[0];

      if (content?.organization_id) {
        const upParams = {
          contentId,
          organizationId: content.organization_id,
          oldStatus: result.old_status as ContentStatus,
          newStatus: result.new_status as ContentStatus,
          creatorId: content.creator_id,
          editorId: content.editor_id,
          recordingAt: content.recording_at,
          recordedAt: content.recorded_at,
          editingAt: content.editing_at,
          deliveredAt: content.delivered_at,
          issueAt: content.issue_at,
          approvedAt: content.approved_at
        };

        logger.debug('ContentStatus Calling handleUPStatusChange');
        await handleUPStatusChange(upParams);
      }
    } catch (upError) {
      logger.error('ContentStatus Error handling UP points', upError);
    }
  }

  return { success: true, oldStatus: result?.old_status, newStatus: result?.new_status };
}

/**
 * Actualiza el estado de un contenido en Supabase y dispara la lógica de puntos UP
 * (transiciones de estado que otorgan o penalizan puntos a creador/editor).
 *
 * Uses a SECURITY DEFINER RPC function that:
 * 1. Bypasses RLS policies to avoid permission issues
 * 2. Updates content status with proper timestamps
 * 3. Triggers fire automatically for UP points
 *
 * @param params - contentId, oldStatus y newStatus
 * @throws Error de Supabase si falla el update del contenido
 * @deprecated Use updateContentStatus(contentId, newStatus) instead - doesn't require old_status
 */
export async function updateContentStatusWithUP(params: StatusChangeParams) {
  const { contentId, oldStatus, newStatus } = params;

  logger.debug('ContentStatusWithUP Starting status change', { contentId, oldStatus, newStatus });

  // Use the simplified RPC - old_status is obtained server-side
  const { data: result, error: rpcError } = await supabase
    .rpc('update_content_status_rpc', {
      p_content_id: contentId,
      p_new_status: newStatus
    });

  if (rpcError) {
    logger.error('ContentStatusWithUP RPC error', rpcError);
    throw rpcError;
  }

  if (result && !result.success) {
    logger.error('ContentStatusWithUP Function error', result.error);
    throw new Error(result.error || 'Failed to update content status');
  }

  logger.debug('ContentStatusWithUP Content status updated via RPC', { newStatus });

  // The database triggers handle UP events automatically
  // But we also call handleUPStatusChange for the Unified Reputation Engine
  // which uses reputation_events table (different from up_events)
  try {
    // Fetch content to get the data needed for UP calculation
    const { data: contentArr } = await supabase
      .rpc('get_content_by_id', { p_content_id: contentId });

    const content = contentArr?.[0];

    if (content?.organization_id) {
      const upParams = {
        contentId,
        organizationId: content.organization_id,
        oldStatus: result?.old_status || oldStatus,
        newStatus: result?.new_status || newStatus,
        creatorId: content.creator_id,
        editorId: content.editor_id,
        recordingAt: content.recording_at,
        recordedAt: content.recorded_at,
        editingAt: content.editing_at,
        deliveredAt: content.delivered_at,
        issueAt: content.issue_at,
        approvedAt: content.approved_at
      };

      logger.debug('ContentStatusWithUP Calling handleUPStatusChange for Unified Reputation');
      await handleUPStatusChange(upParams);
      logger.debug('ContentStatusWithUP UP points handled successfully');
    }
  } catch (upError) {
    // Log but don't fail - the main status update succeeded
    logger.error('ContentStatusWithUP Error handling Unified Reputation UP points', upError);
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