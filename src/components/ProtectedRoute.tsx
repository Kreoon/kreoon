import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { AppRole } from '@/types/database';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
  requiresOrg?: boolean; // Whether this route requires an organization
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
  if (roles.length === 0) return '/pending-access';

  // If activeRole is set and valid, use it
  if (activeRole && roles.includes(activeRole)) {
    switch (activeRole) {
      case 'admin':
        return '/dashboard';
      case 'ambassador':
        return '/dashboard';
      case 'strategist':
        return '/strategist-dashboard';
      case 'creator':
        return '/creator-dashboard';
      case 'editor':
        return '/editor-dashboard';
      case 'client':
        return '/client-dashboard';
    }
  }

  // Fallback to role priority
  if (roles.includes('admin')) return '/dashboard';
  if (roles.includes('ambassador')) return '/dashboard';
  if (roles.includes('strategist')) return '/strategist-dashboard';
  if (roles.includes('creator')) return '/creator-dashboard';
  if (roles.includes('editor')) return '/editor-dashboard';
  if (roles.includes('client')) return '/client-dashboard';
  return '/pending-access';
}

// Routes that require an organization to be selected
const ORG_REQUIRED_ROUTES = ['/dashboard', '/board', '/content', '/creators', '/scripts', '/clients', '/team', '/ranking'];

export function ProtectedRoute({ children, allowedRoles, requiresOrg }: ProtectedRouteProps) {
  const { user, profile, roles: realRoles, activeRole, loading, rolesLoaded } = useAuth();
  const { isImpersonating, effectiveRoles, isRootAdmin } = useImpersonation();
  const { isPlatformRoot, currentOrgId, loading: orgLoading } = useOrgOwner();
  const location = useLocation();

  const [clientHasCompany, setClientHasCompany] = useState<boolean | null>(null);
  const [checkingCompany, setCheckingCompany] = useState(false);

  // Use effective roles when impersonating, otherwise real roles
  const rolesToCheck = isImpersonating ? effectiveRoles : realRoles;
  const isClient = rolesToCheck.includes('client');

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
        const result = await withTimeout(
          supabase.from('client_users').select('id').eq('user_id', user.id).limit(1),
          CLIENT_COMPANY_TIMEOUT_MS,
          'client_users'
        );

        const { data, error } = result as { data: unknown[] | null; error: unknown | null };

        if (error) {
          console.error('Error checking client company:', error);
          setClientHasCompany(false);
        } else {
          setClientHasCompany(!!(data && data.length > 0));
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

  // Users without any roles need to request access
  if (realRoles.length === 0 && !isPlatformRoot) {
    return <Navigate to="/pending-access" replace />;
  }

  // Client users without an associated company cannot access the app
  if (isClient && !clientHasCompany) {
    return <Navigate to="/no-company" replace />;
  }

  // Check if user has the required role
  if (allowedRoles && allowedRoles.length > 0) {
    // Platform root with org selected is treated as admin
    const effectiveRolesToCheck = isPlatformRoot && currentOrgId ? ['admin', ...rolesToCheck] : rolesToCheck;
    const hasAllowedRole = allowedRoles.some((role) => effectiveRolesToCheck.includes(role));
    if (!hasAllowedRole) {
      // Instead of showing unauthorized, redirect to their appropriate dashboard
      const correctDashboard = getDashboardPath(rolesToCheck, activeRole);
      return <Navigate to={correctDashboard} replace />;
    }
  }

  return <>{children}</>;
}

