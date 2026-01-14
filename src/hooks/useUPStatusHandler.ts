import { supabase } from '@/integrations/supabase/client';
import { calculateDaysInColombia, calculateCreatorPoints, CREATOR_POINTS_CONFIG } from './useUPCreadores';
import { calculateEditorPoints, EDITOR_POINTS_CONFIG } from './useUPEditores';

/**
 * Central handler for UP points based on content status changes
 * This should be called when content status changes
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

  try {
    // ============================================
    // CREATOR POINTS: En grabación → Grabado
    // ============================================
    if (oldStatus === 'recording' && newStatus === 'recorded' && creatorId && recordingAt) {
      const recordingStartDate = new Date(recordingAt);
      const recordedDate = recordedAt ? new Date(recordedAt) : now;
      const daysToDeliver = calculateDaysInColombia(recordingStartDate, recordedDate);
      const { eventType, points } = calculateCreatorPoints(daysToDeliver);

      if (eventType !== 'reassignment') {
        await supabase.from('up_creadores').insert({
          user_id: creatorId,
          content_id: contentId,
          organization_id: organizationId,
          event_type: eventType,
          points,
          description: `Entrega en ${daysToDeliver} día(s)`,
          recording_started_at: recordingAt,
          recorded_at: recordedDate.toISOString(),
          days_to_deliver: daysToDeliver
        });
      }
    }

    // ============================================
    // EDITOR POINTS: En edición → Entregado
    // ============================================
    if (oldStatus === 'editing' && newStatus === 'delivered' && editorId && editingAt) {
      const editingStartDate = new Date(editingAt);
      const deliveredDate = deliveredAt ? new Date(deliveredAt) : now;
      const daysToDeliver = calculateDaysInColombia(editingStartDate, deliveredDate);
      const { eventType, points } = calculateEditorPoints(daysToDeliver);

      if (eventType !== 'reassignment') {
        await supabase.from('up_editores').insert({
          user_id: editorId,
          content_id: contentId,
          organization_id: organizationId,
          event_type: eventType,
          points,
          description: `Entrega en ${daysToDeliver} día(s)`,
          editing_started_at: editingAt,
          delivered_at: deliveredDate.toISOString(),
          days_to_deliver: daysToDeliver
        });
      }
    }

    // ============================================
    // NOVEDAD PENALTY: Entregado → Novedad
    // Penaliza tanto al creador como al editor
    // ============================================
    if ((oldStatus === 'delivered' || oldStatus === 'corrected') && newStatus === 'issue') {
      const issueDate = issueAt ? new Date(issueAt) : now;

      // Penalty for creator
      if (creatorId) {
        await supabase.from('up_creadores').insert({
          user_id: creatorId,
          content_id: contentId,
          organization_id: organizationId,
          event_type: 'issue_penalty',
          points: CREATOR_POINTS_CONFIG.issue_penalty,
          description: 'Penalización por novedad',
          issue_at: issueDate.toISOString()
        });
      }

      // Penalty for editor
      if (editorId) {
        await supabase.from('up_editores').insert({
          user_id: editorId,
          content_id: contentId,
          organization_id: organizationId,
          event_type: 'issue_penalty',
          points: EDITOR_POINTS_CONFIG.issue_penalty,
          description: 'Penalización por novedad',
          issue_at: issueDate.toISOString()
        });
      }
    }

    // ============================================
    // ISSUE RECOVERY: Novedad → Aprobado (dentro de 2 días)
    // Devuelve los -10 UP a ambos
    // ============================================
    if (oldStatus === 'issue' && newStatus === 'approved' && issueAt) {
      const issueDateParsed = new Date(issueAt);
      const approvedDate = approvedAt ? new Date(approvedAt) : now;
      const daysSinceIssue = calculateDaysInColombia(issueDateParsed, approvedDate);

      if (daysSinceIssue <= 2) {
        // Find and recover creator penalty
        if (creatorId) {
          const { data: creatorPenalty } = await supabase
            .from('up_creadores')
            .select('id')
            .eq('content_id', contentId)
            .eq('user_id', creatorId)
            .eq('event_type', 'issue_penalty')
            .eq('is_recovered', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (creatorPenalty) {
            await supabase.from('up_creadores').insert({
              user_id: creatorId,
              content_id: contentId,
              organization_id: organizationId,
              event_type: 'issue_recovery',
              points: CREATOR_POINTS_CONFIG.issue_recovery,
              description: `Recuperación por corrección en ${daysSinceIssue} día(s)`,
              issue_at: issueAt,
              approved_at: approvedDate.toISOString(),
              related_issue_id: creatorPenalty.id,
              is_recovered: true
            });

            await supabase
              .from('up_creadores')
              .update({ is_recovered: true })
              .eq('id', creatorPenalty.id);
          }
        }

        // Find and recover editor penalty
        if (editorId) {
          const { data: editorPenalty } = await supabase
            .from('up_editores')
            .select('id')
            .eq('content_id', contentId)
            .eq('user_id', editorId)
            .eq('event_type', 'issue_penalty')
            .eq('is_recovered', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (editorPenalty) {
            await supabase.from('up_editores').insert({
              user_id: editorId,
              content_id: contentId,
              organization_id: organizationId,
              event_type: 'issue_recovery',
              points: EDITOR_POINTS_CONFIG.issue_recovery,
              description: `Recuperación por corrección en ${daysSinceIssue} día(s)`,
              issue_at: issueAt,
              approved_at: approvedDate.toISOString(),
              related_issue_id: editorPenalty.id,
              is_recovered: true
            });

            await supabase
              .from('up_editores')
              .update({ is_recovered: true })
              .eq('id', editorPenalty.id);
          }
        }
      }
    }

    // ============================================
    // CLEAN APPROVAL BONUS: Entregado → Aprobado (sin pasar por Novedad)
    // +10 UP para ambos
    // ============================================
    if (oldStatus === 'delivered' && newStatus === 'approved') {
      const approvedDate = approvedAt ? new Date(approvedAt) : now;

      // Check if there was any issue for this content
      const { data: hadIssue } = await supabase
        .from('up_creadores')
        .select('id')
        .eq('content_id', contentId)
        .eq('event_type', 'issue_penalty')
        .limit(1)
        .maybeSingle();

      if (!hadIssue) {
        // Clean approval - no issues found
        if (creatorId) {
          await supabase.from('up_creadores').insert({
            user_id: creatorId,
            content_id: contentId,
            organization_id: organizationId,
            event_type: 'clean_approval_bonus',
            points: CREATOR_POINTS_CONFIG.clean_approval_bonus,
            description: 'Bonus por aprobación limpia',
            approved_at: approvedDate.toISOString()
          });
        }

        if (editorId) {
          await supabase.from('up_editores').insert({
            user_id: editorId,
            content_id: contentId,
            organization_id: organizationId,
            event_type: 'clean_approval_bonus',
            points: EDITOR_POINTS_CONFIG.clean_approval_bonus,
            description: 'Bonus por aprobación limpia',
            approved_at: approvedDate.toISOString()
          });
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error handling UP status change:', error);
    return { success: false, error };
  }
}

/**
 * Check if content needs reassignment due to delay
 * Returns true if reassignment is needed
 */
export function checkCreatorReassignmentNeeded(recordingAt: string): boolean {
  const recordingStartDate = new Date(recordingAt);
  const now = new Date();
  const days = calculateDaysInColombia(recordingStartDate, now);
  return days >= 6;
}

export function checkEditorReassignmentNeeded(editingAt: string): boolean {
  const editingStartDate = new Date(editingAt);
  const now = new Date();
  const days = calculateDaysInColombia(editingStartDate, now);
  return days >= 5;
}
