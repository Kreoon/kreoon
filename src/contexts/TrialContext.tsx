import { createContext, useContext, ReactNode } from 'react';
import { useOrganizationTrial } from '@/hooks/useOrganizationTrial';
import { useAuth } from '@/hooks/useAuth';

interface TrialContextValue {
  isReadOnly: boolean;
  isTrialActive: boolean;
  isExpired: boolean;
  daysRemaining: number;
  billingEnabled: boolean;
  selectedPlan: string;
  canCreate: boolean;
  canEdit: boolean;
}

const TrialContext = createContext<TrialContextValue>({
  isReadOnly: false,
  isTrialActive: true,
  isExpired: false,
  daysRemaining: 30,
  billingEnabled: false,
  selectedPlan: 'starter',
  canCreate: true,
  canEdit: true,
});

export function TrialProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const trialStatus = useOrganizationTrial(profile?.current_organization_id || null);

  // Determine if read-only mode should be active
  const isReadOnly = trialStatus.billingEnabled && trialStatus.isExpired;
  
  const value: TrialContextValue = {
    isReadOnly,
    isTrialActive: trialStatus.isTrialActive,
    isExpired: trialStatus.isExpired,
    daysRemaining: trialStatus.daysRemaining,
    billingEnabled: trialStatus.billingEnabled,
    selectedPlan: trialStatus.selectedPlan,
    canCreate: !isReadOnly,
    canEdit: !isReadOnly,
  };

  return (
    <TrialContext.Provider value={value}>
      {children}
    </TrialContext.Provider>
  );
}

export function useTrialStatus() {
  return useContext(TrialContext);
}
