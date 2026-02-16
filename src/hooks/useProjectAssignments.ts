import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ProjectAssignment, AssignmentStatus } from '@/types/unifiedProject.types';

interface UseProjectAssignmentsOptions {
  projectSource: 'content' | 'marketplace';
  projectId: string;
}

// Map DB row → camelCase ProjectAssignment
function mapRow(row: any): ProjectAssignment {
  return {
    id: row.id,
    projectSource: row.project_source,
    contentId: row.content_id,
    marketplaceProjectId: row.marketplace_project_id,
    userId: row.user_id,
    roleId: row.role_id,
    roleGroup: row.role_group,
    phase: row.phase,
    dependsOn: row.depends_on || [],
    status: row.status as AssignmentStatus,
    paymentAmount: row.payment_amount != null ? Number(row.payment_amount) : undefined,
    paymentCurrency: row.payment_currency || 'COP',
    paymentMethod: row.payment_method || undefined,
    isPaid: row.is_paid || false,
    paidAt: row.paid_at || undefined,
    workspaceBlockType: row.workspace_block_type || undefined,
    invitedAt: row.invited_at || undefined,
    acceptedAt: row.accepted_at || undefined,
    startedAt: row.started_at || undefined,
    deliveredAt: row.delivered_at || undefined,
    approvedAt: row.approved_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: row.user || undefined,
  };
}

// Timestamp fields auto-stamped on status change
const STATUS_TIMESTAMP: Partial<Record<AssignmentStatus, string>> = {
  invited: 'invited_at',
  accepted: 'accepted_at',
  in_progress: 'started_at',
  delivered: 'delivered_at',
  approved: 'approved_at',
  paid: 'paid_at',
};

export function useProjectAssignments({ projectSource, projectId }: UseProjectAssignmentsOptions) {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  const fkColumn = projectSource === 'content' ? 'content_id' : 'marketplace_project_id';

  // ---- Fetch all active assignments for this project ----
  const fetchAssignments = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('project_assignments')
        .select('*, user:profiles(full_name, avatar_url)')
        .eq(fkColumn, projectId)
        .neq('status', 'cancelled')
        .order('phase', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAssignments((data || []).map(mapRow));
    } catch (err) {
      console.error('[useProjectAssignments] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, fkColumn]);

  // ---- Create a new assignment ----
  const createAssignment = useCallback(async (params: {
    userId: string;
    roleId: string;
    roleGroup: string;
    phase?: number;
    dependsOn?: string[];
    paymentAmount?: number;
    paymentCurrency?: string;
    paymentMethod?: 'payment' | 'exchange';
    workspaceBlockType?: string;
  }) => {
    try {
      const payload: Record<string, any> = {
        project_source: projectSource,
        [fkColumn]: projectId,
        user_id: params.userId,
        role_id: params.roleId,
        role_group: params.roleGroup,
        phase: params.phase || 1,
        depends_on: params.dependsOn || [],
        payment_amount: params.paymentAmount ?? null,
        payment_currency: params.paymentCurrency || 'COP',
        payment_method: params.paymentMethod || null,
        workspace_block_type: params.workspaceBlockType || null,
        status: 'pending',
      };

      const { data, error } = await (supabase as any)
        .from('project_assignments')
        .insert(payload)
        .select('*, user:profiles(full_name, avatar_url)')
        .single();

      if (error) throw error;

      setAssignments(prev => [...prev, mapRow(data)]);
      toast({ title: 'Asignacion creada' });
      return data?.id || null;
    } catch (err: any) {
      console.error('[useProjectAssignments] create error:', err);
      if (err?.code === '23505') {
        toast({ title: 'Este usuario ya tiene este rol asignado', variant: 'destructive' });
      } else {
        toast({ title: 'Error al crear asignacion', variant: 'destructive' });
      }
      return null;
    }
  }, [projectSource, projectId, fkColumn, toast]);

  // ---- Update assignment status ----
  const updateStatus = useCallback(async (assignmentId: string, newStatus: AssignmentStatus) => {
    try {
      const updates: Record<string, any> = { status: newStatus };
      const tsField = STATUS_TIMESTAMP[newStatus];
      if (tsField) updates[tsField] = new Date().toISOString();
      if (newStatus === 'paid') updates.is_paid = true;

      const { error } = await (supabase as any)
        .from('project_assignments')
        .update(updates)
        .eq('id', assignmentId);

      if (error) throw error;

      setAssignments(prev =>
        prev.map(a => a.id === assignmentId
          ? { ...a, status: newStatus, isPaid: newStatus === 'paid' ? true : a.isPaid }
          : a,
        ),
      );
      toast({ title: 'Estado actualizado' });
    } catch (err) {
      console.error('[useProjectAssignments] updateStatus error:', err);
      toast({ title: 'Error al actualizar estado', variant: 'destructive' });
    }
  }, [toast]);

  // ---- Update payment details ----
  const updatePayment = useCallback(async (assignmentId: string, updates: {
    paymentAmount?: number;
    paymentCurrency?: string;
    paymentMethod?: 'payment' | 'exchange';
  }) => {
    try {
      const { error } = await (supabase as any)
        .from('project_assignments')
        .update({
          payment_amount: updates.paymentAmount ?? null,
          payment_currency: updates.paymentCurrency || 'COP',
          payment_method: updates.paymentMethod || null,
        })
        .eq('id', assignmentId);

      if (error) throw error;

      setAssignments(prev =>
        prev.map(a => a.id === assignmentId
          ? { ...a, paymentAmount: updates.paymentAmount, paymentCurrency: updates.paymentCurrency || 'COP', paymentMethod: updates.paymentMethod }
          : a,
        ),
      );
      toast({ title: 'Pago actualizado' });
    } catch (err) {
      console.error('[useProjectAssignments] updatePayment error:', err);
      toast({ title: 'Error al actualizar pago', variant: 'destructive' });
    }
  }, [toast]);

  // ---- Cancel (soft-delete) an assignment ----
  const cancelAssignment = useCallback(async (assignmentId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('project_assignments')
        .update({ status: 'cancelled' })
        .eq('id', assignmentId);

      if (error) throw error;
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      toast({ title: 'Asignacion cancelada' });
    } catch (err) {
      console.error('[useProjectAssignments] cancel error:', err);
      toast({ title: 'Error al cancelar asignacion', variant: 'destructive' });
    }
  }, [toast]);

  return {
    assignments,
    loading,
    fetchAssignments,
    createAssignment,
    updateStatus,
    updatePayment,
    cancelAssignment,
  };
}

export type UseProjectAssignmentsReturn = ReturnType<typeof useProjectAssignments>;
