/**
 * useReferralProgram — Complete Referral Monetization Module
 *
 * Separate from Ambassador (badge). This is a business module for:
 * - Tracking referral codes, clicks, signups, conversions
 * - Calculating and paying commissions
 * - Managing payout requests
 * - Cross-organization capable
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { useToast } from '@/hooks/use-toast';

// ─── Types ───────────────────────────────────────────────

export interface ReferralProgram {
  id: string;
  organization_id: string;
  referrer_commission_type: 'percentage' | 'fixed';
  referrer_commission_value: number;
  referee_bonus_type: 'percentage' | 'fixed' | 'none';
  referee_bonus_value: number;
  max_referrals_per_user: number | null;
  commission_duration_months: number;
  minimum_payout: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReferralCode {
  id: string;
  user_id: string;
  organization_id: string;
  code: string;
  custom_url: string | null;
  total_clicks: number;
  total_signups: number;
  total_conversions: number;
  total_earnings: number;
  is_active: boolean;
  created_at: string;
}

export interface OrgReferral {
  id: string;
  referral_code_id: string;
  referrer_id: string;
  referee_id: string | null;
  organization_id: string;
  status: 'pending' | 'active' | 'converted' | 'expired' | 'cancelled';
  clicked_at: string | null;
  signed_up_at: string | null;
  converted_at: string | null;
  expires_at: string | null;
  source_url: string | null;
  utm_params: Record<string, any> | null;
  created_at: string;
}

export interface ReferralCommission {
  id: string;
  referral_id: string;
  referrer_id: string;
  organization_id: string;
  transaction_type: 'subscription' | 'project' | 'purchase' | 'other';
  transaction_id: string | null;
  transaction_amount: number | null;
  commission_rate: number | null;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  paid_at: string | null;
  payout_id: string | null;
  created_at: string;
}

export interface ReferralPayout {
  id: string;
  user_id: string;
  organization_id: string;
  amount: number;
  payment_method: string;
  payment_details: Record<string, any> | null;
  status: 'requested' | 'processing' | 'completed' | 'failed';
  processed_at: string | null;
  processed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface ReferralStats {
  total_referrals: number;
  active_referrals: number;
  converted_referrals: number;
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
}

// ─── Hook: Referral Program Config ──────────────────────

export function useReferralProgramConfig(organizationId?: string) {
  const { currentOrgId } = useOrgOwner();
  const orgId = organizationId || currentOrgId;
  const [program, setProgram] = useState<ReferralProgram | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('referral_programs')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      setProgram(data as ReferralProgram | null);
      setLoading(false);
    })();
  }, [orgId]);

  const updateProgram = useCallback(async (updates: Partial<ReferralProgram>) => {
    if (!orgId) return false;
    const { error } = await supabase
      .from('referral_programs')
      .upsert({ organization_id: orgId, ...program, ...updates } as any, {
        onConflict: 'organization_id',
      });
    if (error) {
      console.error('Error updating referral program:', error);
      return false;
    }
    setProgram(prev => prev ? { ...prev, ...updates } : null);
    return true;
  }, [orgId, program]);

  return { program, loading, updateProgram };
}

// ─── Hook: My Referral Code ─────────────────────────────

export function useMyReferralCode(organizationId?: string) {
  const { currentOrgId } = useOrgOwner();
  const orgId = organizationId || currentOrgId;
  const [code, setCode] = useState<ReferralCode | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCode = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .limit(1)
      .maybeSingle();

    if (error) console.error('Error fetching referral code:', error);
    setCode(data as ReferralCode | null);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchCode(); }, [fetchCode]);

  // Generate a new code if user doesn't have one
  const generateCode = useCallback(async () => {
    if (!orgId) return null;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return null; }

    const { data: codeStr, error } = await supabase.rpc('generate_referral_code', {
      p_user_id: user.id,
      p_organization_id: orgId,
    });

    if (error) {
      console.error('Error generating referral code:', error);
      toast({ variant: 'destructive', description: 'Error al generar código de referido' });
      setLoading(false);
      return null;
    }

    toast({ description: `Código generado: ${codeStr}` });
    await fetchCode();
    return codeStr;
  }, [orgId, toast, fetchCode]);

  const copyCode = useCallback(() => {
    if (code?.code) {
      navigator.clipboard.writeText(code.code);
      toast({ description: 'Código copiado al portapapeles' });
    }
  }, [code, toast]);

  return { code, loading, generateCode, copyCode, refetch: fetchCode };
}

// ─── Hook: My Referrals (as referrer) ───────────────────

export function useMyReferrals(organizationId?: string) {
  const { currentOrgId } = useOrgOwner();
  const orgId = organizationId || currentOrgId;
  const [referrals, setReferrals] = useState<OrgReferral[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReferrals = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Fetch referrals
    const { data: refs, error } = await supabase
      .from('org_referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching referrals:', error);
    setReferrals((refs as OrgReferral[]) || []);

    // Fetch stats via RPC
    const { data: statsData, error: statsErr } = await supabase.rpc('get_referral_stats', {
      p_user_id: user.id,
      p_organization_id: orgId,
    });

    if (statsErr) console.error('Error fetching referral stats:', statsErr);
    if (statsData?.[0]) {
      setStats(statsData[0] as ReferralStats);
    }

    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchReferrals(); }, [fetchReferrals]);

  return { referrals, stats, loading, refetch: fetchReferrals };
}

// ─── Hook: My Commissions ───────────────────────────────

export function useMyCommissions(organizationId?: string) {
  const { currentOrgId } = useOrgOwner();
  const orgId = organizationId || currentOrgId;
  const [commissions, setCommissions] = useState<ReferralCommission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('org_referral_commissions')
        .select('*')
        .eq('referrer_id', user.id)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) console.error('Error fetching commissions:', error);
      setCommissions((data as ReferralCommission[]) || []);
      setLoading(false);
    })();
  }, [orgId]);

  return { commissions, loading };
}

// ─── Hook: Payout Requests ──────────────────────────────

export function useReferralPayouts(organizationId?: string) {
  const { currentOrgId } = useOrgOwner();
  const orgId = organizationId || currentOrgId;
  const [payouts, setPayouts] = useState<ReferralPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayouts = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('referral_payouts')
      .select('*')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching payouts:', error);
    setPayouts((data as ReferralPayout[]) || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  // Request a payout
  const requestPayout = useCallback(async (
    amount: number,
    paymentMethod: string,
    paymentDetails?: Record<string, any>
  ) => {
    if (!orgId) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('referral_payouts')
      .insert({
        user_id: user.id,
        organization_id: orgId,
        amount,
        payment_method: paymentMethod,
        payment_details: paymentDetails || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error requesting payout:', error);
      toast({ variant: 'destructive', description: 'Error al solicitar retiro' });
      return null;
    }

    toast({ description: `Solicitud de retiro por $${amount.toLocaleString()} creada` });
    fetchPayouts();
    return data as ReferralPayout;
  }, [orgId, toast, fetchPayouts]);

  return { payouts, loading, requestPayout, refetch: fetchPayouts };
}

// ─── Hook: Admin — Manage Org Referrals ─────────────────

export function useAdminReferrals(organizationId?: string) {
  const { currentOrgId } = useOrgOwner();
  const orgId = organizationId || currentOrgId;
  const [allReferrals, setAllReferrals] = useState<OrgReferral[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<ReferralPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAll = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);

    const [refsRes, payoutsRes] = await Promise.all([
      supabase
        .from('org_referrals')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('referral_payouts')
        .select('*')
        .eq('organization_id', orgId)
        .in('status', ['requested', 'processing'])
        .order('created_at', { ascending: true }),
    ]);

    setAllReferrals((refsRes.data as OrgReferral[]) || []);
    setPendingPayouts((payoutsRes.data as ReferralPayout[]) || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Process a payout
  const processPayout = useCallback(async (payoutId: string, status: 'completed' | 'failed', notes?: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('referral_payouts')
      .update({
        status,
        processed_at: new Date().toISOString(),
        processed_by: user?.id || null,
        notes,
      })
      .eq('id', payoutId);

    if (error) {
      console.error('Error processing payout:', error);
      toast({ variant: 'destructive', description: 'Error al procesar retiro' });
      return false;
    }

    // If completed, mark related commissions as paid
    if (status === 'completed') {
      await supabase
        .from('org_referral_commissions')
        .update({ status: 'paid', paid_at: new Date().toISOString(), payout_id: payoutId })
        .eq('payout_id', payoutId);
    }

    toast({ description: status === 'completed' ? 'Retiro completado' : 'Retiro rechazado' });
    fetchAll();
    return true;
  }, [toast, fetchAll]);

  return { allReferrals, pendingPayouts, loading, processPayout, refetch: fetchAll };
}
