import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { useOrgMarketplace } from '@/hooks/useOrgMarketplace';
import { useTalentGateConfig } from '@/hooks/useTalentGateConfig';
import { AppRole } from '@/types/database';
import { getPermissionGroup, getDashboardForRole, getDashboardForAccountType, type PermissionGroup } from '@/lib/permissionGroups';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
  requiresOrg?: boolean; // Whether this route requires an organization
  allowNoRoles?: boolean; // Allow users without any roles (for social routes)
  requirePlatformAdmin?: boolean; // Only platform admins (user_roles or ROOT_EMAILS) can access
}

const CLIENT_COMPANY_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
    Promise.resolve(promise).then(
      (res) => {
        window.clearTimeout(id);
        resolve(res as T);
      },
      (err) => {
        window.clearTimeout(id);
        reject(err);
      }
    );
  });
}

// Helper to get the correct dashboard path based on active role or user roles
function getDashboardPath(roles: AppRole[], activeRole?: AppRole | null, isUnlockedFreelancerOrBrandMember?: boolean): string {
  // Users without org roles
  if (roles.length === 0) {
    // Brand members go to client dashboard
    if (isUnlockedFreelancerOrBrandMember === true) {
      return '/client-dashboard';
    }
    // Unlocked freelancers go to freelancer dashboard, others to marketplace
    return '/marketplace';
  }

  // If activeRole is set and valid, use it (resolves via permission group)
  if (activeRole && roles.includes(activeRole)) {
    return getDashboardForRole(activeRole);
  }

  // Fallback to first role by priority order
  // NOTE: Using actual role names, not PermissionGroups (which only has 'admin'|'talent'|'client')
  const rolePriority: AppRole[] = [
    'admin', 'team_leader',
    'digital_strategist', 'creative_strategist', 'strategist',
    'content_creator', 'creator',
    'editor',
    'community_manager',
    'client'
  ];
  for (const priorityRole of rolePriority) {
    if (roles.includes(priorityRole)) {
      return getDashboardForRole(priorityRole);
    }
  }
  return '/marketplace';
}

// Routes that require an organization to be selected
const ORG_REQUIRED_ROUTES = ['/dashboard', '/board', '/content', '/talent', '/scripts', '/clients-hub', '/team', '/ranking'];

// Routes that users without roles can access (social/marketplace)
// Note: Talents without referral keys are blocked from marketplace in the referral gate check below
const SOCIAL_ROUTES = ['/social', '/marketplace', '/explore', '/profile', '/settings'];

// Additional routes that unlocked freelancers can access (no org roles but platform_access_unlocked = true)
const FREELANCE_ALLOWED_ROUTES = ['/board', '/scripts', '/freelancer-dashboard', '/social-hub', '/wallet', '/planes'];

// Routes that brand members/clients can access (independent brands without org)
const CLIENT_ALLOWED_ROUTES = ['/client-dashboard', '/board', '/marketplace', '/wallet', '/planes', '/social-hub', '/live', '/marketing-ads', '/ad-generator'];

export function ProtectedRoute({ children, allowedRoles, requiresOrg, allowNoRoles, requirePlatformAdmin }: ProtectedRouteProps) {
  const { user, profile, roles: realRoles, activeRole, loading, rolesLoaded, isPlatformAdmin, accountType } = useAuth();
  const { isImpersonating, effectiveRoles, isRootAdmin } = useImpersonation();
  const { isPlatformRoot, currentOrgId, loading: orgLoading } = useOrgOwner();
  const { marketplaceEnabled, clientMarketplaceEnabled, loading: mktLoading } = useOrgMarketplace();
  const { isEnabled: talentGateEnabled, isLoading: talentGateLoading } = useTalentGateConfig();
  const location = useLocation();

  const [clientHasCompany, setClientHasCompany] = useState<boolean | null>(null);
  const [checkingCompany, setCheckingCompany] = useState(false);

  // Use effective roles when impersonating, otherwise real roles
  const rolesToCheck = isImpersonating ? effectiveRoles : realRoles;
  const isClient = rolesToCheck.some(r => getPermissionGroup(r) === 'client');

  // Check if current route requires org
  const routeRequiresOrg = requiresOrg ?? ORG_REQUIRED_ROUTES.includes(location.pathname);

  useEffect(() => {
    async function checkClientCompany() {
      // When impersonating, we skip the company check (root admin is just viewing)
      if (isImpersonating) {
        setClientHasCompany(true);
        return;
      }

      if (!user || !isClient) {
        setClientHasCompany(true); // Non-clients don't need company
        return;
      }

      setCheckingCompany(true);
      try {
        // Check client_users (org-linked), company_profiles (AI matching), and brand_members (independent brands)
        const [clientResult, companyResult, brandResult] = await Promise.all([
          withTimeout(
            supabase.from('client_users').select('id').eq('user_id', user.id).limit(1),
            CLIENT_COMPANY_TIMEOUT_MS,
            'client_users'
          ),
          withTimeout(
            (supabase as any).from('company_profiles').select('id').eq('user_id', user.id).limit(1),
            CLIENT_COMPANY_TIMEOUT_MS,
            'company_profiles'
          ),
          withTimeout(
            (supabase as any).from('brand_members').select('id').eq('user_id', user.id).eq('status', 'active').limit(1),
            CLIENT_COMPANY_TIMEOUT_MS,
            'brand_members'
          ),
        ]);

        const { data: clientData, error: clientError } = clientResult as { data: unknown[] | null; error: unknown | null };
        const { data: companyData, error: companyError } = companyResult as { data: unknown[] | null; error: unknown | null };
        const { data: brandData, error: brandError } = brandResult as { data: unknown[] | null; error: unknown | null };

        if (clientError && companyError && brandError) {
          console.error('Error checking client company:', clientError, companyError, brandError);
          setClientHasCompany(false);
        } else {
          const hasClient = !!(clientData && clientData.length > 0);
          const hasCompany = !!(companyData && companyData.length > 0);
          const hasBrand = !!(brandData && brandData.length > 0);
          setClientHasCompany(hasClient || hasCompany || hasBrand);
        }
      } catch (err) {
        console.error('Error checking client company:', err);
        // If this check fails/times out, don't block the app in a loading state.
        // We default to "has company = false" which will redirect clients to /no-company.
        setClientHasCompany(false);
      } finally {
        setCheckingCompany(false);
      }
    }

    if (rolesLoaded && user) {
      checkClientCompany();
    }
  }, [user, isClient, rolesLoaded, isImpersonating]);

  // Wait for both auth loading AND roles to be loaded AND org check for platform root
  if (loading || !rolesLoaded || orgLoading || talentGateLoading || (isClient && clientHasCompany === null) || checkingCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Platform root without org selected trying to access org-required routes
  if (isPlatformRoot && !currentOrgId && routeRequiresOrg && !isImpersonating) {
    return <Navigate to="/no-organization" replace />;
  }

  // Root admin bypasses most checks when impersonating
  if (isRootAdmin && isImpersonating) {
    // When impersonating, we allow access based on the impersonated role
    if (allowedRoles && allowedRoles.length > 0) {
      const hasAllowedRole = allowedRoles.some((role) => effectiveRoles.includes(role));
      if (!hasAllowedRole) {
        // Navigate to the impersonated role's dashboard
        const correctDashboard = getDashboardPath(effectiveRoles, null);
        return <Navigate to={correctDashboard} replace />;
      }
    }
    return <>{children}</>;
  }

  // Platform-admin-only routes (e.g., /crm/*) — only platform admins can access
  if (requirePlatformAdmin && !isPlatformAdmin) {
    const correctDashboard = getDashboardPath(rolesToCheck, activeRole);
    return <Navigate to={correctDashboard} replace />;
  }

  // ─── ACCOUNT TYPE VALIDATION ───────────────────────────────────────────
  // Validate routes based on user's account type (set during onboarding)
  // This ensures users only access routes appropriate to their account type
  const TALENT_ROUTES = ['/freelancer-dashboard', '/scripts', '/wallet', '/board']; // /board para gestionar proyectos
  const ORG_ROUTES = ['/dashboard', '/board', '/content', '/talent', '/scripts', '/clients-hub', '/team', '/ranking'];
  const CLIENT_ROUTES = ['/client-dashboard', '/ad-generator', '/marketing-ads'];
  const SHARED_ROUTES = ['/marketplace', '/social', '/explore', '/profile', '/settings', '/onboarding', '/unlock-access', '/live', '/social-hub', '/planes', '/wallet'];

  // Only enforce account type validation if user has a set account type
  // and is not a platform admin/root
  if (accountType && !isPlatformAdmin && !isPlatformRoot && !isImpersonating) {
    const isSharedRoute = SHARED_ROUTES.some(route => location.pathname.startsWith(route));

    if (!isSharedRoute) {
      const isTalentRoute = TALENT_ROUTES.some(route => location.pathname.startsWith(route));
      const isOrgRoute = ORG_ROUTES.some(route => location.pathname.startsWith(route));
      const isClientRoute = CLIENT_ROUTES.some(route => location.pathname.startsWith(route));

      // Talent users blocked from org-only and client-only routes
      if (accountType === 'talent' && (isOrgRoute || isClientRoute) && !isTalentRoute) {
        return <Navigate to={getDashboardForAccountType(accountType)} replace />;
      }

      // Organization users blocked from talent-only and client-only routes
      if (accountType === 'organization' && !isOrgRoute && (isTalentRoute || isClientRoute)) {
        return <Navigate to={getDashboardForAccountType(accountType)} replace />;
      }

      // Client users blocked from talent-only and org-only routes
      if (accountType === 'client' && (isTalentRoute || isOrgRoute) && !isClientRoute) {
        return <Navigate to={getDashboardForAccountType(accountType)} replace />;
      }
    }
  }

  // Check if current route is a social route (accessible without roles)
  const isSocialRoute = SOCIAL_ROUTES.some(route => location.pathname.startsWith(route)) || allowNoRoles;

  // Users with pending_assignment status are blocked from app
  if (profile?.organization_status === 'pending_assignment') {
    return <Navigate to="/pending-access" replace />;
  }

  // ─── REFERRAL GATE: Must check BEFORE allowing social routes ───
  // Talents (users with creator_profile but no org) need platform_access_unlocked
  // They MUST complete 3 referral keys before accessing ANY route including marketplace
  // Bypass ONLY: platform root/admin, org members, clients, unlock-access page itself, settings/profile, onboarding
  const hasOrganization = !!(currentOrgId || profile?.current_organization_id);
  const isTalentRole = rolesToCheck.length > 0 && rolesToCheck.every(r => {
    const pg = getPermissionGroup(r);
    return pg === 'talent';
  });
  // Routes that talents without keys CAN access (onboarding flow)
  const isGateBypassRoute = location.pathname === '/unlock-access'
    || location.pathname.startsWith('/settings')
    || location.pathname.startsWith('/profile/')
    || location.pathname === '/welcome-talent'
    || location.pathname.startsWith('/onboarding');

  // Check if user is a brand member (they bypass referral gate)
  // Brand members can be detected by: having client role, active_brand_id, or active_role='client'
  const isBrandMember = isClient ||
    !!profile?.active_brand_id ||
    profile?.active_role === 'client';

  // Pure talents = users without org roles who need to complete referral gate
  // Exclude brand members (clients) from gate requirement
  const isPureTalentWithoutKeys =
    realRoles.length === 0 &&
    !hasOrganization &&
    !isPlatformRoot &&
    !isPlatformAdmin &&
    !isBrandMember &&
    profile?.platform_access_unlocked !== true;

  // Block talents without keys from ALL routes except gate bypass routes
  // Only apply if talent gate is enabled globally
  if (
    talentGateEnabled &&
    (isTalentRole || isPureTalentWithoutKeys) &&
    !isPlatformRoot &&
    !isPlatformAdmin &&
    !isGateBypassRoute &&
    !hasOrganization &&
    !isBrandMember &&
    profile?.platform_access_unlocked !== true
  ) {
    return <Navigate to="/unlock-access" replace />;
  }

  // Users without any roles can only access social routes (AFTER referral gate check)
  // But only if they are unlocked (passed referral gate) or are brand members
  if (realRoles.length === 0 && !isPlatformRoot) {
    // Users without keys cannot access marketplace - redirect to unlock (only if gate enabled)
    if (talentGateEnabled && !profile?.platform_access_unlocked && !isBrandMember && !isGateBypassRoute) {
      return <Navigate to="/unlock-access" replace />;
    }

    // Unlocked freelancers can access additional routes beyond social routes
    const isFreelanceAllowedRoute = FREELANCE_ALLOWED_ROUTES.some(route => location.pathname.startsWith(route));
    const isUnlockedFreelancer = profile?.platform_access_unlocked === true;

    // Brand members can access client-specific routes
    const isClientAllowedRoute = CLIENT_ALLOWED_ROUTES.some(route => location.pathname.startsWith(route));

    // Allow: social routes, freelance routes (if unlocked), or client routes (if brand member)
    if (!isSocialRoute && !(isUnlockedFreelancer && isFreelanceAllowedRoute) && !(isBrandMember && isClientAllowedRoute)) {
      return <Navigate to="/marketplace" replace />;
    }
    // Allow access to social routes, freelance routes, and client routes for users without org roles
    return <>{children}</>;
  }

  // Client users without an associated company can only access social routes
  if (isClient && !clientHasCompany) {
    if (isSocialRoute) {
      return <>{children}</>;
    }
    return <Navigate to="/no-company" replace />;
  }

  // Block marketplace routes based on org settings and user role
  const isMarketplaceRoute = location.pathname.startsWith('/marketplace');
  if (isMarketplaceRoute && realRoles.length > 0 && !isPlatformRoot) {
    // Client users: block ALL marketplace routes when clientMarketplaceEnabled is false
    if (isClient && !clientMarketplaceEnabled) {
      const correctDashboard = getDashboardPath(rolesToCheck, activeRole);
      return <Navigate to={correctDashboard} replace />;
    }
    // Internal team: block action routes when marketplaceEnabled is false
    // BUT allow browse-only routes for talent recruitment
    const isMarketplaceBrowseRoute = location.pathname === '/marketplace'
      || location.pathname.startsWith('/marketplace/org/')
      || location.pathname.startsWith('/marketplace/creator/')
      || location.pathname.startsWith('/marketplace/talent-lists')
      || location.pathname.startsWith('/marketplace/invitations')
      || location.pathname.startsWith('/marketplace/inquiries');
    if (!isClient && !marketplaceEnabled && !isMarketplaceBrowseRoute) {
      const correctDashboard = getDashboardPath(rolesToCheck, activeRole);
      return <Navigate to={correctDashboard} replace />;
    }
  }

  // Check if user has the required role (allowedRoles are treated as permission groups)
  if (allowedRoles && allowedRoles.length > 0) {
    // Platform root with org selected is treated as admin
    const effectiveRolesToCheck = isPlatformRoot && currentOrgId ? ['admin' as AppRole, ...rolesToCheck] : rolesToCheck;

    // Allow unlocked freelancers to access their allowed routes even without org roles
    const isFreelanceAllowedRoute = FREELANCE_ALLOWED_ROUTES.some(route => location.pathname.startsWith(route));
    const isUnlockedFreelancer = realRoles.length === 0 && profile?.platform_access_unlocked === true && !isPlatformRoot;
    if (isUnlockedFreelancer && isFreelanceAllowedRoute) {
      return <>{children}</>;
    }

    // Allow brand members to access client routes even without org roles
    const isClientAllowedRoute = CLIENT_ALLOWED_ROUTES.some(route => location.pathname.startsWith(route));
    if (isBrandMember && isClientAllowedRoute && allowedRoles.includes('client')) {
      return <>{children}</>;
    }

    // Match by permission group: allowedRoles names correspond to permission group names
    const hasAllowedRole = allowedRoles.some((allowedRole) => {
      const allowedGroup = getPermissionGroup(allowedRole);
      return effectiveRolesToCheck.some(r => getPermissionGroup(r) === allowedGroup);
    });
    if (!hasAllowedRole) {
      // Brand members without org roles but accessing client routes should be allowed
      if (isBrandMember && allowedRoles.includes('client')) {
        return <>{children}</>;
      }
      // Instead of showing unauthorized, redirect to their appropriate dashboard
      const correctDashboard = getDashboardPath(rolesToCheck, activeRole, isBrandMember);
      return <Navigate to={correctDashboard} replace />;
    }
  }

  return <>{children}</>;
}

