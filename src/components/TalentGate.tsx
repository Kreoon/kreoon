import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getPermissionGroup } from '@/lib/permissionGroups';
import { useTalentGateConfig } from '@/hooks/useTalentGateConfig';
import { Loader2 } from 'lucide-react';

interface TalentGateProps {
  children: ReactNode;
}

/**
 * TalentGate - Blocks talents without platform_access_unlocked from accessing public routes.
 *
 * This component is for PUBLIC routes (like /marketplace) that:
 * - Anonymous users CAN access (for browsing)
 * - Logged-in talents WITHOUT keys CANNOT access (must unlock first)
 * - Logged-in users WITH keys or non-talents CAN access
 *
 * The gate can be disabled globally from Platform Settings > Security
 */
export function TalentGate({ children }: TalentGateProps) {
  const { user, profile, roles, loading, rolesLoaded } = useAuth();
  const { isEnabled: gateEnabled, isLoading: configLoading } = useTalentGateConfig();
  const location = useLocation();

  // Still loading - show spinner
  if (loading || !rolesLoaded || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Gate disabled globally - allow everyone
  if (!gateEnabled) {
    return <>{children}</>;
  }

  // No user = anonymous visitor, allow access to public routes
  if (!user) {
    return <>{children}</>;
  }

  // Check if user is a brand member (clients bypass talent gate entirely)
  // Brand members can be detected by: having client role, active_brand_id, or active_role='client'
  const isClient = roles.some(r => getPermissionGroup(r) === 'client');
  const isBrandMember = isClient ||
    !!profile?.active_brand_id ||
    profile?.active_role === 'client';

  // Brand members/clients always pass through - they don't need keys
  if (isBrandMember) {
    return <>{children}</>;
  }

  // Check if user is a talent (all non-admin, non-client roles)
  const isTalentOnly = roles.length > 0 && roles.every(r => {
    const pg = getPermissionGroup(r);
    return pg === 'talent';
  });

  // Also check pure marketplace users (no org roles but has creator_profile)
  const hasOrganization = !!profile?.current_organization_id;
  const isPureTalent = roles.length === 0 && !hasOrganization;

  // If user is a talent without keys, block and redirect
  if ((isTalentOnly || isPureTalent) && !hasOrganization && profile?.platform_access_unlocked !== true) {
    console.log('[TalentGate] Blocking talent without keys from:', location.pathname);
    return <Navigate to="/unlock-access" replace />;
  }

  // Allow access
  return <>{children}</>;
}
