import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CouponDiscountType = 'percentage' | 'fixed_amount';
export type CouponDuration = 'once' | 'repeating' | 'forever';
export type CouponPlan = 'monthly' | 'yearly';

export interface AcademyCoupon {
  id: string;
  space_id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  applies_to: CouponPlan[];
  duration: CouponDuration;
  duration_in_months: number | null;
  max_redemptions: number | null;
  redemptions_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAcademyCoupons(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['academy', 'coupons', spaceId],
    queryFn: async (): Promise<AcademyCoupon[]> => {
      if (!spaceId) return [];
      const { data, error } = await (supabase as any)
        .from('academy_coupons')
        .select('*')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AcademyCoupon[];
    },
    enabled: !!spaceId,
  });
}

export interface CouponInput {
  space_id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  applies_to: CouponPlan[];
  duration: CouponDuration;
  duration_in_months: number | null;
  max_redemptions: number | null;
  expires_at: string | null;
  is_active?: boolean;
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CouponInput) => {
      const { data, error } = await (supabase as any)
        .from('academy_coupons')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['academy', 'coupons', vars.space_id] });
    },
  });
}

export function useUpdateCoupon(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CouponInput> }) => {
      const { error } = await (supabase as any)
        .from('academy_coupons')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy', 'coupons', spaceId] });
    },
  });
}

export function useDeleteCoupon(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('academy_coupons')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy', 'coupons', spaceId] });
    },
  });
}

/** Validar un código (público — usado en SpaceJoinGate). */
export async function validateCouponCode(
  spaceId: string,
  code: string,
  plan: CouponPlan,
): Promise<{
  valid: boolean;
  error?: string;
  coupon_id?: string;
  original_price_usd?: number;
  discount_amount_usd?: number;
  final_price_usd?: number;
  duration?: CouponDuration;
  duration_in_months?: number | null;
}> {
  const { data, error } = await (supabase as any).rpc('validate_academy_coupon', {
    p_space_id: spaceId,
    p_code: code,
    p_plan: plan,
  });
  if (error) {
    return { valid: false, error: error.message ?? 'rpc_error' };
  }
  return data;
}
