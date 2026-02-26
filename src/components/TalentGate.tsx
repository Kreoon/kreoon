import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getPermissionGroup } from '@/lib/permissionGroups';
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
 */
export function TalentGate({ children }: TalentGateProps) {
  const { user, profile, roles, loading, rolesLoaded } = useAuth();
  const location = useLocation();

  // Still loading - show spinner
  if (loading || !rolesLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No user = anonymous visitor, allow access to public routes
  if (!user) {
    return <>{children}</>;
  }

  // Check if user is a talent (creator/editor permission groups only)
  const isTalentOnly = roles.length > 0 && roles.every(r => {
    const pg = getPermissionGroup(r);
    return pg === 'creator' || pg === 'editor';
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
