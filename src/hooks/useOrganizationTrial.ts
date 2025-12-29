import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TrialStatus {
  isTrialActive: boolean;
  trialEndDate: Date | null;
  trialStartedAt: Date | null;
  daysRemaining: number;
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled';
  selectedPlan: string;
  showWarningBanner: boolean;
  warningDays: number | null;
  isExpired: boolean;
  billingEnabled: boolean;
}

export function useOrganizationTrial(organizationId: string | null) {
  // Fetch billing enabled setting
  const { data: billingEnabled } = useQuery({
    queryKey: ['billing-enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'billing_enabled')
        .single();
      
      if (error) return false;
      return data?.value === 'true';
    },
  });

  // Fetch warning days setting
  const { data: warningDays } = useQuery({
    queryKey: ['trial-warning-days'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'trial_warning_days')
        .single();
      
      if (error) return [7, 3];
      return data?.value?.split(',').map(Number) || [7, 3];
    },
  });

  // Fetch organization trial data
  const { data: orgData, refetch } = useQuery({
    queryKey: ['organization-trial', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      const { data, error } = await supabase
        .from('organizations')
        .select('trial_active, trial_started_at, trial_end_date, subscription_status, selected_plan')
        .eq('id', organizationId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const trialStatus = useMemo<TrialStatus>(() => {
    const now = new Date();
    const trialEndDate = orgData?.trial_end_date ? new Date(orgData.trial_end_date) : null;
    const trialStartedAt = orgData?.trial_started_at ? new Date(orgData.trial_started_at) : null;
    
    // Calculate days remaining
    const daysRemaining = trialEndDate 
      ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    
    // Check if expired
    const isExpired = trialEndDate ? now > trialEndDate : false;
    
    // Determine if we should show warning banner
    const warningThresholds = warningDays || [7, 3];
    const showWarningBanner = daysRemaining > 0 && daysRemaining <= Math.max(...warningThresholds);
    const warningDay = showWarningBanner 
      ? warningThresholds.find(d => daysRemaining <= d) || null
      : null;

    return {
      isTrialActive: orgData?.trial_active ?? true,
      trialEndDate,
      trialStartedAt,
      daysRemaining,
      subscriptionStatus: (orgData?.subscription_status as TrialStatus['subscriptionStatus']) || 'trial',
      selectedPlan: orgData?.selected_plan || 'starter',
      showWarningBanner: billingEnabled ? showWarningBanner : false,
      warningDays: warningDay,
      isExpired: billingEnabled ? isExpired : false,
      billingEnabled: billingEnabled ?? false,
    };
  }, [orgData, billingEnabled, warningDays]);

  return {
    ...trialStatus,
    refetch,
  };
}

export function useBillingControl() {
  const { data: billingEnabled, refetch } = useQuery({
    queryKey: ['billing-enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'billing_enabled')
        .single();
      
      if (error) return false;
      return data?.value === 'true';
    },
  });

  const toggleBilling = async (enabled: boolean) => {
    const { error } = await supabase
      .from('app_settings')
      .update({ value: enabled ? 'true' : 'false' })
      .eq('key', 'billing_enabled');
    
    if (error) throw error;
    refetch();
  };

  return {
    billingEnabled: billingEnabled ?? false,
    toggleBilling,
    refetch,
  };
}
