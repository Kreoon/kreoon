import { calculateDaysInColombia, calculateCreatorPoints, CREATOR_POINTS_CONFIG } from './useUPCreadores';
import { calculateEditorPoints, EDITOR_POINTS_CONFIG } from './useUPEditores';
import { logReputationEvent } from '@/hooks/useUnifiedReputation';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Get active season ID for an organization
 */
async function getActiveSeasonId(organizationId: string): Promise<string | null> {
  const { data } = await supabase
    .from('reputation_seasons')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .maybeSingle();
  return data?.id || null;
}

/**
 * Central handler for UP points based on content status changes
 * Uses the Unified Reputation Engine (reputation_events table)
 */
export async function handleUPStatusChange(params: {
  contentId: string;
  organizationId: string;
  oldStatus: string;
  newStatus: string;
  creatorId?: string | null;
  editorId?: string | null;
  recordingAt?: string | null;
  recordedAt?: string | null;
  editingAt?: string | null;
  deliveredAt?: string | null;
  issueAt?: string | null;
  approvedAt?: string | null;
}) {
  const {
    contentId,
    organizationId,
    oldStatus,
    newStatus,
    creatorId,
    editorId,
    recordingAt,
    recordedAt,
    editingAt,
    deliveredAt,
    issueAt,
    approvedAt
  } = params;

  const now = new Date();

  logger.debug('UP Handler Status change', { contentId, oldStatus, newStatus, creatorId, editorId });

  try {
    // Get active season ID for this org
    const seasonId = await getActiveSeasonId(organizationId);
    logger.debug('UP Handler Active season', { seasonId });

    // ============================================
    // CREATOR POINTS: recording → recorded OR assigned → recorded
    // ============================================
    if ((oldStatus === 'recording' || oldStatus === 'assigned') && newStatus === 'recorded' && creatorId) {
      const startDate = recordingAt ? new Date(recordingAt) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recordedDate = recordedAt ? new Date(recordedAt) : now;
      const daysToDeliver = calculateDaysInColombia(startDate, recordedDate);
      const { eventType, points } = calculateCreatorPoints(daysToDeliver);

      logger.debug('UP Handler Creator delivery', { daysToDeliver, eventType, points });

      if (eventType !== 'reassignment') {
        await logReputationEvent({
          organizationId,
          userId: creatorId,
          roleKey: 'creator',
          referenceType: 'content',
          referenceId: contentId,
          eventType: 'delivery',
          eventSubtype: eventType,
          basePoints: points,
          multiplier: 1.0,
          breakdown: {
            base: points,
            days_to_deliver: daysToDeliver,
            source: 'content_status_change',
          },
          seasonId: seasonId || undefined,
        });
      }
    }

    // ============================================
    // EDITOR POINTS: editing → delivered
    // ============================================
    if (oldStatus === 'editing' && newStatus === 'delivered' && editorId) {
      const startDate = editingAt ? new Date(editingAt) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const deliveredDate = deliveredAt ? new Date(deliveredAt) : now;
      const daysToDeliver = calculateDaysInColombia(startDate, deliveredDate);
      const { eventType, points } = calculateEditorPoints(daysToDeliver);

      logger.debug('UP Handler Editor delivery', { daysToDeliver, eventType, points });

      if (eventType !== 'reassignment') {
        await logReputationEvent({
          organizationId,
          userId: editorId,
          roleKey: 'editor',
          referenceType: 'content',
          referenceId: contentId,
          eventType: 'delivery',
          eventSubtype: eventType,
          basePoints: points,
          multiplier: 1.0,
          breakdown: {
            base: points,
            days_to_deliver: daysToDeliver,
            source: 'content_status_change',
          },
          seasonId: seasonId || undefined,
        });
      }
    }

    // ============================================
    // NOVEDAD PENALTY: Entregado/Corregido → Novedad
    // ============================================
    if ((oldStatus === 'delivered' || oldStatus === 'corrected') && newStatus === 'issue') {
      logger.debug('UP Handler Issue penalty triggered');

      if (creatorId) {
        await logReputationEvent({
          organizationId,
          userId: creatorId,
          roleKey: 'creator',
          referenceType: 'content',
          referenceId: contentId,
          eventType: 'issue',
          eventSubtype: 'issue_penalty',
          basePoints: CREATOR_POINTS_CONFIG.issue_penalty,
          breakdown: { base: CREATOR_POINTS_CONFIG.issue_penalty, source: 'issue_reported' },
          seasonId: seasonId || undefined,
        });
      }

      if (editorId) {
        await logReputationEvent({
          organizationId,
          userId: editorId,
          roleKey: 'editor',
          referenceType: 'content',
          referenceId: contentId,
          eventType: 'issue',
          eventSubtype: 'issue_penalty',
          basePoints: EDITOR_POINTS_CONFIG.issue_penalty,
          breakdown: { base: EDITOR_POINTS_CONFIG.issue_penalty, source: 'issue_reported' },
          seasonId: seasonId || undefined,
        });
      }
    }

    // ============================================
    // ISSUE RECOVERY: Novedad → Aprobado (dentro de 2 días)
    // ============================================
    if (oldStatus === 'issue' && newStatus === 'approved' && issueAt) {
      const issueDateParsed = new Date(issueAt);
      const approvedDate = approvedAt ? new Date(approvedAt) : now;
      const daysSinceIssue = calculateDaysInColombia(issueDateParsed, approvedDate);

      logger.debug('UP Handler Issue recovery check', { daysSinceIssue });

      if (daysSinceIssue <= 2) {
        if (creatorId) {
          await logReputationEvent({
            organizationId,
            userId: creatorId,
            roleKey: 'creator',
            referenceType: 'content',
            referenceId: contentId,
            eventType: 'recovery',
            eventSubtype: 'issue_recovery',
            basePoints: CREATOR_POINTS_CONFIG.issue_recovery,
            breakdown: { base: CREATOR_POINTS_CONFIG.issue_recovery, days_to_recover: daysSinceIssue },
            seasonId: seasonId || undefined,
          });
        }

        if (editorId) {
          await logReputationEvent({
            organizationId,
            userId: editorId,
            roleKey: 'editor',
            referenceType: 'content',
            referenceId: contentId,
            eventType: 'recovery',
            eventSubtype: 'issue_recovery',
            basePoints: EDITOR_POINTS_CONFIG.issue_recovery,
            breakdown: { base: EDITOR_POINTS_CONFIG.issue_recovery, days_to_recover: daysSinceIssue },
            seasonId: seasonId || undefined,
          });
        }
      }
    }

    // ============================================
    // CLEAN APPROVAL BONUS: Entregado/Corregido → Aprobado (sin pasar por Novedad)
    // ============================================
    if ((oldStatus === 'delivered' || oldStatus === 'corrected') && newStatus === 'approved') {
      logger.debug('UP Handler Clean approval bonus');

      if (creatorId) {
        await logReputationEvent({
          organizationId,
          userId: creatorId,
          roleKey: 'creator',
          referenceType: 'content',
          referenceId: contentId,
          eventType: 'approval',
          eventSubtype: 'clean_approval_bonus',
          basePoints: CREATOR_POINTS_CONFIG.clean_approval_bonus,
          breakdown: { base: CREATOR_POINTS_CONFIG.clean_approval_bonus, source: 'clean_approval' },
          seasonId: seasonId || undefined,
        });
      }

      if (editorId) {
        await logReputationEvent({
          organizationId,
          userId: editorId,
          roleKey: 'editor',
          referenceType: 'content',
          referenceId: contentId,
          eventType: 'approval',
          eventSubtype: 'clean_approval_bonus',
          basePoints: EDITOR_POINTS_CONFIG.clean_approval_bonus,
          breakdown: { base: EDITOR_POINTS_CONFIG.clean_approval_bonus, source: 'clean_approval' },
          seasonId: seasonId || undefined,
        });
      }
    }

    return { success: true };
  } catch (error) {
    logger.error('UP Handler Error handling UP status change', error);
    return { success: false, error };
  }
}

/**
 * Check if content needs reassignment due to delay
 */
export function checkCreatorReassignmentNeeded(recordingAt: string): boolean {
  const recordingStartDate = new Date(recordingAt);
  const now = new Date();
  const days = calculateDaysInColombia(recordingStartDate, now);
  return days >= 8;
}

export function checkEditorReassignmentNeeded(editingAt: string): boolean {
  const editingStartDate = new Date(editingAt);
  const now = new Date();
  const days = calculateDaysInColombia(editingStartDate, now);
  return days >= 6;
}
