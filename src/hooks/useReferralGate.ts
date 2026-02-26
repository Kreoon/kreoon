import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getPermissionGroup } from '@/lib/permissionGroups';

export interface GateReferral {
  referred_id: string;
  status: string;
  created_at: string;
  full_name: string | null;
  referred_avatar: string | null;
  has_active_profile: boolean;
  has_avatar: boolean;
  has_portfolio: boolean;
  is_qualified: boolean;
}

interface GateStatus {
  unlocked: boolean;
  qualified_count: number;
  remaining: number;
  referral_code: string | null;
  referrals: GateReferral[];
}

export function useReferralGate() {
  const { user, profile, roles, isPlatformAdmin, isClient, loading: authLoading, rolesLoaded } = useAuth();

  // Quick bypass: platform admin, already unlocked, belongs to an org, client, or has non-talent org roles
  // Users who need the referral gate:
  // - Users with NO roles (independent talents without org)
  // - Users with ONLY creator/editor roles
  const hasOrganization = !!profile?.current_organization_id;

  // Check if user has roles that are NOT creator/editor (meaning they have org-level permissions)
  const hasNonTalentRoles = roles.length > 0 && roles.some(r => {
    const pg = getPermissionGroup(r);
    return pg !== 'creator' && pg !== 'editor';
  });

  const quickBypass =
    isPlatformAdmin ||
    profile?.platform_access_unlocked === true ||
    hasOrganization ||
    isClient ||
    hasNonTalentRoles; // Only bypass if user has non-talent roles (admin, strategist, etc.)

  const {
    data: gateStatus,
    isLoading: gateLoading,
  } = useQuery({
    queryKey: ['referral-gate-status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_referral_gate_status', {
        p_user_id: user!.id,
      });
      if (error) throw error;
      return data as unknown as GateStatus;
    },
    enabled: !!user?.id && rolesLoaded && !quickBypass,
    staleTime: 2 * 60 * 1000, // 2 min
  });

  // Derive final state
  const isUnlocked = quickBypass || gateStatus?.unlocked === true;
  const isGateLoading = authLoading || !rolesLoaded || (!quickBypass && gateLoading);

  return {
    isUnlocked,
    isGateLoading,
    qualifiedCount: quickBypass ? 3 : (gateStatus?.qualified_count ?? 0),
    remaining: quickBypass ? 0 : (gateStatus?.remaining ?? 3),
    referralCode: gateStatus?.referral_code ?? null,
    referrals: gateStatus?.referrals ?? [],
  };
}
