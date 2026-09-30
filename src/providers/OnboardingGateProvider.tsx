import { ReactNode, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingGate } from '@/hooks/useOnboardingGate';
import { NovaOnboardingWizard } from '@/components/onboarding/NovaOnboardingWizard';
import { CreatorOnboardingWizard } from '@/components/onboarding/CreatorOnboardingWizard';
import { RegistrationEntryRedirect } from '@/pages/registro/OrganizationRegistrationPage';
import { getOnboardingTrack } from '@/lib/onboarding/track';
import { registrationContinuePath } from '@/lib/registration/paths';

// Rutas que NO requieren onboarding completado
const EXEMPT_ROUTES = [
  '/legal/',       // Páginas legales
  '/auth',         // Auth callback y logout
  '/registro',     // Registro de creadores: el paso /continuar necesita sesión y corre ANTES del onboarding
  '/terms',        // Términos legacy
  '/privacy',      // Privacy legacy
  '/data-deletion',
];

// Wizard público de onboarding de clientes (`/onboarding/:token`, token = 64
// chars hex). NO cubre `/onboarding/profile` (ruta distinta, sí debe pasar
// por el gate normal).
const ONBOARDING_WIZARD_ROUTE = /^\/onboarding\/[a-f0-9]{64}$/;

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = [
  '/',
  '/marketplace',
  '/marketplace/creator/',
  '/marketplace/org/',
  '/unete',
  '/unete/',
  '/register',
  '/r/',
  '/comunidad/',
  '/calculadora-ugc',
  '/casos-de-exito',
  '/org/',
  '/company/',
  '/profile/',
];

interface OnboardingGateProviderProps {
  children: ReactNode;
}

/**
 * Provider que bloquea el acceso a la aplicación hasta que el usuario
 * complete su perfil y acepte los documentos legales.
 *
 * Se inserta DESPUÉS de AuthProvider en el stack de providers.
 */
export function OnboardingGateProvider({ children }: OnboardingGateProviderProps) {
  const location = useLocation();
  const { user, loading: authLoading, roles, rolesLoaded, profile } = useAuth();
  const { isComplete, isLoading: gateLoading, currentStep } = useOnboardingGate();

  // Verificar si la ruta está exenta
  const isExemptRoute = useMemo(() => {
    const path = location.pathname;

    // Rutas explícitamente exentas
    if (EXEMPT_ROUTES.some(route => path.startsWith(route))) {
      return true;
    }

    // Wizard público de onboarding de clientes: el gate Nova no debe
    // aparecer sobre este formulario aunque el cliente ya tenga sesión
    // (se la crea el paso 0 "Tu acceso" del propio wizard).
    if (ONBOARDING_WIZARD_ROUTE.test(path)) {
      return true;
    }

    return false;
  }, [location.pathname]);

  // Verificar si es una ruta pública (no requiere auth)
  const isPublicRoute = useMemo(() => {
    const path = location.pathname;

    // Landing page
    if (path === '/') return true;

    // Otras rutas públicas
    if (PUBLIC_ROUTES.some(route => path.startsWith(route) || path === route)) {
      return true;
    }

    return false;
  }, [location.pathname]);

  // Si no hay usuario autenticado, renderizar normalmente
  // (las rutas públicas se renderizan, las protegidas redirigen a /auth)
  if (!user) {
    return <>{children}</>;
  }

  // Si la ruta está exenta, renderizar normalmente
  if (isExemptRoute) {
    return <>{children}</>;
  }

  // Si está cargando auth o gate, mostrar loading
  if (authLoading || gateLoading) {
    return <OnboardingLoadingScreen />;
  }

  // Si el onboarding no está completo, mostrar el asistente que corresponde.
  // BLOQUEA toda la app hasta completar
  if (!isComplete && currentStep !== 'complete') {
    if (!rolesLoaded) return <OnboardingLoadingScreen />;

    const track = getOnboardingTrack({
      roles: roles ?? [],
      userType: (profile as { user_type?: string | null } | null)?.user_type,
      hasBrand: Boolean((profile as { active_brand_id?: string | null } | null)?.active_brand_id),
    });

    // Creadores: asistente corto (nombre público, foto, tipo de contenido), reanudable y omitible.
    if (track === 'creator') return <CreatorOnboardingWizard />;

    // Sesión sin ninguna membresía: no se ofrece elegir marca/organización. Se lleva al registro de
    // creadores de la organización del host, donde la persona confirma de forma explícita.
    if (track === 'needs_membership') {
      return <RegistrationEntryRedirect buildTarget={(slug) => registrationContinuePath(slug)} />;
    }

    // Clientes/marcas existentes y demás roles conservan su flujo actual.
    return <NovaOnboardingWizard />;
  }

  // Onboarding completo, renderizar la app normalmente
  return <>{children}</>;
}

function OnboardingLoadingScreen() {
  return (
    <div className="min-h-screen bg-zinc-200 dark:bg-background flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full" />
    </div>
  );
}

export default OnboardingGateProvider;
