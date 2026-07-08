import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  UnlockRule,
  UnlockTargetType,
  UnlockRuleType,
  UnlockEvaluation,
} from '@/types/academy';

// ── ADMIN: listar reglas de un target ──────────────────────────────────────
export function useUnlockRules(targetType: UnlockTargetType, targetId: string | undefined) {
  return useQuery({
    queryKey: ['academy', 'unlock-rules', targetType, targetId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('academy_unlock_rules')
        .select('*')
        .eq('target_type', targetType)
        .eq('target_id', targetId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as UnlockRule[];
    },
    enabled: !!targetId,
    staleTime: 30_000,
  });
}

// ── ADMIN: crear / borrar reglas ────────────────────────────────────────────
export interface NewUnlockRule {
  space_id: string;
  target_type: UnlockTargetType;
  target_id: string;
  rule_type: UnlockRuleType;
  int_value?: number | null;
  ref_id?: string | null;
  text_value?: string | null;
}

export function useManageUnlockRules() {
  const qc = useQueryClient();
  const invalidate = (targetType: UnlockTargetType, targetId: string) => {
    qc.invalidateQueries({ queryKey: ['academy', 'unlock-rules', targetType, targetId] });
    qc.invalidateQueries({ queryKey: ['academy', 'unlock-status'] });
  };

  const addRule = useMutation({
    mutationFn: async (rule: NewUnlockRule) => {
      const { data, error } = await (supabase as any)
        .from('academy_unlock_rules')
        .insert(rule)
        .select()
        .single();
      if (error) throw error;
      return data as UnlockRule;
    },
    onSuccess: (r) => invalidate(r.target_type, r.target_id),
  });

  const removeRule = useMutation({
    mutationFn: async (rule: Pick<UnlockRule, 'id' | 'target_type' | 'target_id'>) => {
      const { error } = await (supabase as any)
        .from('academy_unlock_rules')
        .delete()
        .eq('id', rule.id);
      if (error) throw error;
      return rule;
    },
    onSuccess: (r) => invalidate(r.target_type, r.target_id),
  });

  return { addRule, removeRule };
}

// ── ALUMNO: evaluar desbloqueo de un target ─────────────────────────────────
const EMPTY_EVAL: UnlockEvaluation = {
  unlocked: true,
  logic: 'all',
  bypass: false,
  requirements: [],
};

export function useUnlockStatus(targetType: UnlockTargetType, targetId: string | undefined) {
  return useQuery({
    queryKey: ['academy', 'unlock-status', targetType, targetId],
    queryFn: async (): Promise<UnlockEvaluation> => {
      const { data, error } = await (supabase as any).rpc('academy_evaluate_unlock', {
        p_target_type: targetType,
        p_target_id: targetId!,
      });
      if (error) throw error;
      return (data ?? EMPTY_EVAL) as UnlockEvaluation;
    },
    enabled: !!targetId,
    staleTime: 30_000,
  });
}

// ── ALUMNO: evaluar varios targets de una sola vez (currículo / grilla) ──────
export interface BatchTarget {
  target_type: UnlockTargetType;
  target_id: string;
}

/** Devuelve un mapa { target_id: UnlockEvaluation }. */
export function useUnlockStatusBatch(targets: BatchTarget[]) {
  const key = targets.map((t) => t.target_id).sort().join(',');
  return useQuery({
    queryKey: ['academy', 'unlock-status', 'batch', key],
    queryFn: async (): Promise<Record<string, UnlockEvaluation>> => {
      if (targets.length === 0) return {};
      const { data, error } = await (supabase as any).rpc('academy_evaluate_unlock_batch', {
        p_targets: targets,
      });
      if (error) throw error;
      return (data ?? {}) as Record<string, UnlockEvaluation>;
    },
    enabled: targets.length > 0,
    staleTime: 30_000,
  });
}
