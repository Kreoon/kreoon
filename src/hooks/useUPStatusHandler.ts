import { supabase } from '@/integrations/supabase/client';
import { calculateDaysInColombia, calculateCreatorPoints, CREATOR_POINTS_CONFIG } from './useUPCreadores';
import { calculateEditorPoints, EDITOR_POINTS_CONFIG } from './useUPEditores';

// Cache whether UP tables exist to avoid 8-10 phantom HTTP requests per status change
let upTablesAvailable: boolean | null = null;

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

  // Short-circuit if UP tables are confirmed missing (avoids 8-10 failed HTTP requests)
  if (upTablesAvailable === false) {
    return { success: true };
  }

  console.log('[UP Handler] Status change:', { contentId, oldStatus, newStatus, creatorId, editorId });

  // Probe table existence on first call
  if (upTablesAvailable === null) {
    const { error: probeError } = await supabase
      .from('up_creadores')
      .select('id')
      .limit(1);
    if (probeError && (probeError.code === '42P01' || probeError.message?.includes('does not exist'))) {
      console.log('[UP Handler] UP tables not available, disabling handler');
      upTablesAvailable = false;
      return { success: true };
    }
    upTablesAvailable = true;
  }

  try {
    // ============================================
    // CREATOR POINTS: recording → recorded OR assigned → recorded
    // Also handle cases where recording_at might be null
    // ============================================
    if ((oldStatus === 'recording' || oldStatus === 'assigned') && newStatus === 'recorded' && creatorId) {
      // Check if we already recorded points for this content+creator
      const { data: existingCreatorPoints } = await supabase
        .from('up_creadores')
        .select('id')
        .eq('content_id', contentId)
        .eq('user_id', creatorId)
        .in('event_type', ['early_delivery', 'on_time_delivery', 'slight_delay', 'late_delivery'])
        .limit(1)
        .maybeSingle();

      if (existingCreatorPoints) {
        console.log('[UP Handler] Creator points already exist for this content, skipping');
      } else {
        // Use recording_at if available, otherwise use a default (today - 1 day as fallback)
        const startDate = recordingAt ? new Date(recordingAt) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const recordedDate = recordedAt ? new Date(recordedAt) : now;
        const daysToDeliver = calculateDaysInColombia(startDate, recordedDate);
        const { eventType, points } = calculateCreatorPoints(daysToDeliver);

        console.log('[UP Handler] Creator delivery:', { daysToDeliver, eventType, points });

        if (eventType !== 'reassignment') {
          const { error } = await supabase.from('up_creadores').insert({
            user_id: creatorId,
            content_id: contentId,
            organization_id: organizationId,
            event_type: eventType,
            points,
            description: `Entrega en ${daysToDeliver} día(s)`,
            recording_started_at: recordingAt || startDate.toISOString(),
            recorded_at: recordedDate.toISOString(),
            days_to_deliver: daysToDeliver
          });

          if (error) {
            console.error('[UP Handler] Error inserting creator points:', error);
          } else {
            console.log('[UP Handler] Creator points inserted successfully');
          }
        }
      }
    }

    // ============================================
    // EDITOR POINTS: editing → delivered
    // Also handle cases where editing_at might be null
    // ============================================
    if (oldStatus === 'editing' && newStatus === 'delivered' && editorId) {
      // Check if we already recorded points for this content+editor
      const { data: existingEditorPoints } = await supabase
        .from('up_editores')
        .select('id')
        .eq('content_id', contentId)
        .eq('user_id', editorId)
        .in('event_type', ['early_delivery', 'on_time_delivery', 'slight_delay', 'late_delivery'])
        .limit(1)
        .maybeSingle();

      if (existingEditorPoints) {
        console.log('[UP Handler] Editor points already exist for this content, skipping');
      } else {
        // Use editing_at if available, otherwise use a default
        const startDate = editingAt ? new Date(editingAt) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const deliveredDate = deliveredAt ? new Date(deliveredAt) : now;
        const daysToDeliver = calculateDaysInColombia(startDate, deliveredDate);
        const { eventType, points } = calculateEditorPoints(daysToDeliver);

        console.log('[UP Handler] Editor delivery:', { daysToDeliver, eventType, points });

        if (eventType !== 'reassignment') {
          const { error } = await supabase.from('up_editores').insert({
            user_id: editorId,
            content_id: contentId,
            organization_id: organizationId,
            event_type: eventType,
            points,
            description: `Entrega en ${daysToDeliver} día(s)`,
            editing_started_at: editingAt || startDate.toISOString(),
            delivered_at: deliveredDate.toISOString(),
            days_to_deliver: daysToDeliver
          });

          if (error) {
            console.error('[UP Handler] Error inserting editor points:', error);
          } else {
            console.log('[UP Handler] Editor points inserted successfully');
          }
        }
      }
    }

    // ============================================
    // NOVEDAD PENALTY: Entregado/Corregido → Novedad
    // Penaliza tanto al creador como al editor
    // ============================================
    if ((oldStatus === 'delivered' || oldStatus === 'corrected') && newStatus === 'issue') {
      const issueDate = issueAt ? new Date(issueAt) : now;
      console.log('[UP Handler] Issue penalty triggered');

      // Check if creator already has penalty for this content
      if (creatorId) {
        const { data: existingCreatorPenalty } = await supabase
          .from('up_creadores')
          .select('id')
          .eq('content_id', contentId)
          .eq('user_id', creatorId)
          .eq('event_type', 'issue_penalty')
          .eq('is_recovered', false)
          .limit(1)
          .maybeSingle();

        if (!existingCreatorPenalty) {
          const { error } = await supabase.from('up_creadores').insert({
            user_id: creatorId,
            content_id: contentId,
            organization_id: organizationId,
            event_type: 'issue_penalty',
            points: CREATOR_POINTS_CONFIG.issue_penalty,
            description: 'Penalización por novedad',
            issue_at: issueDate.toISOString()
          });

          if (error) {
            console.error('[UP Handler] Error inserting creator issue penalty:', error);
          }
        }
      }

      // Check if editor already has penalty for this content
      if (editorId) {
        const { data: existingEditorPenalty } = await supabase
          .from('up_editores')
          .select('id')
          .eq('content_id', contentId)
          .eq('user_id', editorId)
          .eq('event_type', 'issue_penalty')
          .eq('is_recovered', false)
          .limit(1)
          .maybeSingle();

        if (!existingEditorPenalty) {
          const { error } = await supabase.from('up_editores').insert({
            user_id: editorId,
            content_id: contentId,
            organization_id: organizationId,
            event_type: 'issue_penalty',
            points: EDITOR_POINTS_CONFIG.issue_penalty,
            description: 'Penalización por novedad',
            issue_at: issueDate.toISOString()
          });

          if (error) {
            console.error('[UP Handler] Error inserting editor issue penalty:', error);
          }
        }
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

      console.log('[UP Handler] Issue recovery check:', { daysSinceIssue });

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
    // CLEAN APPROVAL BONUS: Entregado/Corregido → Aprobado (sin pasar por Novedad)
    // +5 UP para ambos
    // ============================================
    if ((oldStatus === 'delivered' || oldStatus === 'corrected') && newStatus === 'approved') {
      const approvedDate = approvedAt ? new Date(approvedAt) : now;

      console.log('[UP Handler] Clean approval check');

      // Check if there was any issue for this content (for creator)
      if (creatorId) {
        const { data: hadCreatorIssue } = await supabase
          .from('up_creadores')
          .select('id')
          .eq('content_id', contentId)
          .eq('event_type', 'issue_penalty')
          .limit(1)
          .maybeSingle();

        // Check if bonus already exists
        const { data: existingCreatorBonus } = await supabase
          .from('up_creadores')
          .select('id')
          .eq('content_id', contentId)
          .eq('user_id', creatorId)
          .eq('event_type', 'clean_approval_bonus')
          .limit(1)
          .maybeSingle();

        if (!hadCreatorIssue && !existingCreatorBonus) {
          const { error } = await supabase.from('up_creadores').insert({
            user_id: creatorId,
            content_id: contentId,
            organization_id: organizationId,
            event_type: 'clean_approval_bonus',
            points: CREATOR_POINTS_CONFIG.clean_approval_bonus,
            description: 'Bonus por aprobación limpia',
            approved_at: approvedDate.toISOString()
          });

          if (error) {
            console.error('[UP Handler] Error inserting creator clean approval bonus:', error);
          } else {
            console.log('[UP Handler] Creator clean approval bonus inserted');
          }
        }
      }

      // Check for editor clean approval
      if (editorId) {
        const { data: hadEditorIssue } = await supabase
          .from('up_editores')
          .select('id')
          .eq('content_id', contentId)
          .eq('event_type', 'issue_penalty')
          .limit(1)
          .maybeSingle();

        // Check if bonus already exists
        const { data: existingEditorBonus } = await supabase
          .from('up_editores')
          .select('id')
          .eq('content_id', contentId)
          .eq('user_id', editorId)
          .eq('event_type', 'clean_approval_bonus')
          .limit(1)
          .maybeSingle();

        if (!hadEditorIssue && !existingEditorBonus) {
          const { error } = await supabase.from('up_editores').insert({
            user_id: editorId,
            content_id: contentId,
            organization_id: organizationId,
            event_type: 'clean_approval_bonus',
            points: EDITOR_POINTS_CONFIG.clean_approval_bonus,
            description: 'Bonus por aprobación limpia',
            approved_at: approvedDate.toISOString()
          });

          if (error) {
            console.error('[UP Handler] Error inserting editor clean approval bonus:', error);
          } else {
            console.log('[UP Handler] Editor clean approval bonus inserted');
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[UP Handler] Error handling UP status change:', error);
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
  return days >= 8;
}

export function checkEditorReassignmentNeeded(editingAt: string): boolean {
  const editingStartDate = new Date(editingAt);
  const now = new Date();
  const days = calculateDaysInColombia(editingStartDate, now);
  return days >= 6;
}