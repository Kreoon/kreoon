import { ReactNode, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { useOrgMarketplace } from '@/hooks/useOrgMarketplace';
import { AppRole } from '@/types/database';
import { getPermissionGroup, getDashboardForAccountType, type PermissionGroup } from '@/lib/permissionGroups';
import { getDashboardPathForRoles } from '@/lib/routing/postAuth';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Rutas permitidas para usuarios con rol único 'student' (Academia + gestión de cuenta)
const STUDENT_ALLOWED_ROUTE_PREFIXES = [
  '/academia',
  '/profile',
  '/settings',
  '/auth',
  '/logout',
];

function isStudentAllowedRoute(pathname: string): boolean {
  return STUDENT_ALLOWED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

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

// Dashboard según rol activo: fuente única compartida con Auth (src/lib/routing/postAuth.ts)
const getDashboardPath = getDashboardPathForRoles;

// Routes that users without roles can access (social/marketplace)
const SOCIAL_ROUTES = ['/marketplace', '/profile', '/settings'];

// Routes that brand members/clients can access (independent brands without org)
const CLIENT_ALLOWED_ROUTES = ['/client-dashboard', '/board', '/marketplace', '/wallet', '/planes', '/marketing-ads', '/ad-generator'];

export function ProtectedRoute({ children, allowedRoles, requiresOrg, allowNoRoles, requirePlatformAdmin }: ProtectedRouteProps) {
  const { user, profile, roles: realRoles, activeRole, loading, rolesLoaded, isPlatformAdmin, accountType } = useAuth();
  const { isImpersonating, effectiveRoles, isRootAdmin } = useImpersonation();
  const { isPlatformRoot, currentOrgId, loading: orgLoading } = useOrgOwner();
  const { marketplaceEnabled, clientMarketplaceEnabled, loading: mktLoading } = useOrgMarketplace();
  const location = useLocation();

  const [clientHasCompany, setClientHasCompany] = useState<boolean | null>(null);
  const [checkingCompany, setCheckingCompany] = useState(false);

  // Throttle del toast de "ruta no permitida para estudiante" para que no se
  // dispare en cada render dentro del mismo intento de navegación.
  const studentRedirectToastRef = useRef<boolean | null>(null);
  useEffect(() => {
    studentRedirectToastRef.current = null;
  }, [location.pathname]);

  // Use effective roles when impersonating, otherwise real roles
  const rolesToCheck = isImpersonating ? effectiveRoles : realRoles;
  const isClient = rolesToCheck.some(r => getPermissionGroup(r) === 'client');

  // Brand members can be detected by: having client role, active_brand_id, or active_role='client'
  const isBrandMember = isClient ||
    !!profile?.active_brand_id ||
    (profile as any)?.active_role === 'client';

  useEffect(() => {
    async function checkClientCompany() {
      // When impersonating, we skip the company check (root admin is just viewing)
      if (isImpersonating) {
        setClientHasCompany(true);
        return;
      }

      if (!user || (!isClient && !isBrandMember)) {
        setClientHasCompany(true); // Non-clients don't need company
        return;
      }

      setCheckingCompany(true);
      try {
        // Check client_users (org-linked), company_profiles (AI matching), and brand_members (independent brands)
        // Note: having current_organization_id alone is NOT sufficient — the client must have
        // an actual clients record linked via client_users, otherwise they're pending setup.
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
  }, [user, isClient, isBrandMember, rolesLoaded, isImpersonating]);

  // Wait for both auth loading AND roles to be loaded AND org check for platform root
  if (loading || !rolesLoaded || orgLoading || ((isClient || isBrandMember) && clientHasCompany === null) || checkingCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // ─── STUDENT GUARD ───────────────────────────────────────────────────
  // Si el usuario es "solo estudiante" (rol único 'student', sin otros roles
  // funcionales), redirigir a /academia con toast cuando intente acceder a
  // rutas fuera del módulo educativo y de su propio perfil.
  const hasStudentRole = rolesToCheck.includes('student' as AppRole);
  const hasNonStudentRole = rolesToCheck.some((r) => getPermissionGroup(r) !== 'student');
  const isStudentOnly = hasStudentRole && !hasNonStudentRole && !isPlatformAdmin && !isPlatformRoot;

  if (isStudentOnly && !isStudentAllowedRoute(location.pathname)) {
    studentRedirectToastRef.current ??= (() => {
      toast.info('Esta sección requiere activar tu cuenta como creador o empresa.');
      return true;
    })();
    return <Navigate to="/academia" replace />;
  }

  // Platform root without org selected trying to access org-required routes.
  // Era `routeRequiresOrg`, que no existe en ningún sitio: al entrar un
  // administrador de plataforma sin organización elegida, esto reventaba con
  // ReferenceError y dejaba la pantalla en blanco en vez de redirigir.
  if (isPlatformRoot && !currentOrgId && requiresOrg && !isImpersonating) {
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

  // Rutas de admin: accesibles para platform root O para usuarios con rol admin en la org
  // Admin de org = plena confianza, mismo nivel que platform admin
  const isOrgAdmin = rolesToCheck.some(r => getPermissionGroup(r) === 'admin');
  if (requirePlatformAdmin && !isPlatformAdmin && !isOrgAdmin) {
    const correctDashboard = getDashboardPath(rolesToCheck, activeRole);
    return <Navigate to={correctDashboard} replace />;
  }

  // ─── ACCOUNT TYPE VALIDATION ───────────────────────────────────────────
  // Validate routes based on user's account type (set during onboarding)
  // This ensures users only access routes appropriate to their account type
  const TALENT_ROUTES = ['/creator-dashboard', '/scripts', '/wallet', '/board', '/content']; // /board y /content para gestionar proyectos y portafolio
  const ORG_ROUTES = ['/dashboard', '/board', '/content', '/talent', '/scripts', '/clients-hub', '/team', '/ranking'];
  const CLIENT_ROUTES = ['/client-dashboard', '/client-board', '/board', '/ad-generator', '/marketing-ads']; // /board para ver proyectos
  const SHARED_ROUTES = ['/marketplace', '/profile', '/settings', '/onboarding', '/unlock-access', '/social-hub', '/planes', '/wallet'];

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

  // Módulos vedados para clientes/brand members: no van en su sidebar y
  // tampoco deben quedar accesibles por URL directa (algunas de estas rutas
  // usan allowNoRoles o no tienen ProtectedRoute propio, por eso el chequeo
  // vive aquí en vez de en allowedRoles de cada <Route>).
  const CLIENT_BLOCKED_ROUTES = ['/social-hub', '/academia', '/scripts'];
  if (
    (isClient || isBrandMember) &&
    !isPlatformAdmin &&
    !isPlatformRoot &&
    !isImpersonating &&
    CLIENT_BLOCKED_ROUTES.some(route => location.pathname.startsWith(route))
  ) {
    return <Navigate to="/client-dashboard" replace />;
  }

  // Routes that require a company/brand to be set up
  const COMPANY_REQUIRED_ROUTES = ['/board', '/client-board'];
  const isCompanyRequiredRoute = COMPANY_REQUIRED_ROUTES.some(r => location.pathname.startsWith(r));

  // Users without any roles (brand members/clients without org)
  if (realRoles.length === 0 && !isPlatformRoot) {
    const isClientAllowedRoute = CLIENT_ALLOWED_ROUTES.some(route => location.pathname.startsWith(route));
    if (!isSocialRoute && !(isBrandMember && isClientAllowedRoute)) {
      return <Navigate to="/marketplace" replace />;
    }
    // Brand members without a company can't access board/kanban
    if (isBrandMember && !clientHasCompany && isCompanyRequiredRoute) {
      return <Navigate to="/no-company" replace />;
    }
    return <>{children}</>;
  }

  // Client users without an associated company can only access social routes and client-dashboard
  if ((isClient || isBrandMember) && !clientHasCompany && isCompanyRequiredRoute) {
    return <Navigate to="/no-company" replace />;
  }
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

/**
 * Deja pasar a todo el mundo MENOS a un cliente con sesión.
 *
 * Es para las rutas que son públicas a propósito y por eso no pueden ir
 * envueltas en `ProtectedRoute` (que manda a /auth a quien no tenga sesión):
 * la home de Academia y su marketplace. Ahí un visitante anónimo debe entrar
 * —son páginas de captación— pero un cliente logueado no, porque Academia no
 * es parte de su plan. El resto de `/academia/*` sí pasa por `ProtectedRoute`
 * o `RequireAcademyAccess`, y para esas ya aplica `CLIENT_BLOCKED_ROUTES`.
 */
export function BlockClientsRoute({ children }: { children: ReactNode }) {
  const { user, profile, roles, loading, rolesLoaded, isPlatformAdmin } = useAuth();
  const { isImpersonating, effectiveRoles } = useImpersonation();
  const { isPlatformRoot } = useOrgOwner();

  // Sin sesión es una visita pública: pasa sin esperar a que carguen los roles.
  if (!user) {
    return <>{children}</>;
  }

  if (loading || !rolesLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const rolesToCheck = isImpersonating ? effectiveRoles : roles;
  const isClient = rolesToCheck.some(r => getPermissionGroup(r) === 'client')
    || (profile as { active_role?: string } | null)?.active_role === 'client';

  if (isClient && !isPlatformAdmin && !isPlatformRoot && !isImpersonating) {
    return <Navigate to="/client-dashboard" replace />;
  }

  return <>{children}</>;
}
