import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { useOrgMarketplace } from '@/hooks/useOrgMarketplace';
import { AppRole } from '@/types/database';
import { getPermissionGroup, getDashboardForRole, type PermissionGroup } from '@/lib/permissionGroups';
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
function getDashboardPath(roles: AppRole[], activeRole?: AppRole | null): string {
  // Users without roles go to marketplace
  if (roles.length === 0) return '/marketplace';

  // If activeRole is set and valid, use it (resolves via permission group)
  if (activeRole && roles.includes(activeRole)) {
    return getDashboardForRole(activeRole);
  }

  // Fallback to first role by group priority
  const groupPriority: PermissionGroup[] = ['admin', 'team_leader', 'strategist', 'editor', 'creator', 'client'];
  for (const group of groupPriority) {
    const match = roles.find(r => getPermissionGroup(r) === group);
    if (match) return getDashboardForRole(match);
  }
  return '/marketplace';
}

// Routes that require an organization to be selected
const ORG_REQUIRED_ROUTES = ['/dashboard', '/board', '/content', '/talent', '/scripts', '/clients-hub', '/team', '/ranking'];

// Routes that users without roles can access (social/marketplace)
const SOCIAL_ROUTES = ['/social', '/marketplace', '/explore', '/profile', '/settings'];

export function ProtectedRoute({ children, allowedRoles, requiresOrg, allowNoRoles, requirePlatformAdmin }: ProtectedRouteProps) {
  const { user, profile, roles: realRoles, activeRole, loading, rolesLoaded, isPlatformAdmin } = useAuth();
  const { isImpersonating, effectiveRoles, isRootAdmin } = useImpersonation();
  const { isPlatformRoot, currentOrgId, loading: orgLoading } = useOrgOwner();
  const { marketplaceEnabled, loading: mktLoading } = useOrgMarketplace();
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
  if (loading || !rolesLoaded || orgLoading || (isClient && clientHasCompany === null) || checkingCompany) {
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

  // Check if current route is a social route (accessible without roles)
  const isSocialRoute = SOCIAL_ROUTES.some(route => location.pathname.startsWith(route)) || allowNoRoles;
  
  // Users without any roles can only access social routes
  if (realRoles.length === 0 && !isPlatformRoot) {
    if (!isSocialRoute) {
      return <Navigate to="/marketplace" replace />;
    }
    // Allow access to social routes for users without roles
    return <>{children}</>;
  }

  // Users with pending_assignment status are blocked from app
  if (profile?.organization_status === 'pending_assignment') {
    return <Navigate to="/pending-access" replace />;
  }

  // Referral gate: users must have platform_access_unlocked = true
  // Bypass: platform root/admin, social/marketplace routes, org members, clients
  const hasOrganization = !!(currentOrgId || profile?.current_organization_id);
  if (
    !isPlatformRoot &&
    !isPlatformAdmin &&
    !requirePlatformAdmin &&
    !isSocialRoute &&
    !hasOrganization &&
    !isClient &&
    profile?.platform_access_unlocked !== true
  ) {
    return <Navigate to="/unlock-access" replace />;
  }

  // Client users without an associated company can only access social routes
  if (isClient && !clientHasCompany) {
    if (isSocialRoute) {
      return <>{children}</>;
    }
    return <Navigate to="/no-company" replace />;
  }

  // Block marketplace routes for users whose org has marketplace disabled
  // BUT allow browse-only routes (/marketplace, /marketplace/org/*, /marketplace/creator/*) for talent recruitment
  const isMarketplaceRoute = location.pathname.startsWith('/marketplace');
  const isMarketplaceBrowseRoute = location.pathname === '/marketplace'
    || location.pathname.startsWith('/marketplace/org/')
    || location.pathname.startsWith('/marketplace/creator/')
    || location.pathname.startsWith('/marketplace/talent-lists')
    || location.pathname.startsWith('/marketplace/invitations')
    || location.pathname.startsWith('/marketplace/inquiries');
  if (isMarketplaceRoute && !marketplaceEnabled && !isMarketplaceBrowseRoute && realRoles.length > 0 && !isPlatformRoot) {
    const correctDashboard = getDashboardPath(rolesToCheck, activeRole);
    return <Navigate to={correctDashboard} replace />;
  }

  // Check if user has the required role (allowedRoles are treated as permission groups)
  if (allowedRoles && allowedRoles.length > 0) {
    // Platform root with org selected is treated as admin
    const effectiveRolesToCheck = isPlatformRoot && currentOrgId ? ['admin' as AppRole, ...rolesToCheck] : rolesToCheck;
    // Match by permission group: allowedRoles names correspond to permission group names
    const hasAllowedRole = allowedRoles.some((allowedRole) => {
      const allowedGroup = getPermissionGroup(allowedRole);
      return effectiveRolesToCheck.some(r => getPermissionGroup(r) === allowedGroup);
    });
    if (!hasAllowedRole) {
      // Instead of showing unauthorized, redirect to their appropriate dashboard
      const correctDashboard = getDashboardPath(rolesToCheck, activeRole);
      return <Navigate to={correctDashboard} replace />;
    }
  }

  return <>{children}</>;
}

