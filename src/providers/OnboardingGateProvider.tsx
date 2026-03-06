import { ReactNode, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingGate } from '@/hooks/useOnboardingGate';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

// Rutas que NO requieren onboarding completado
const EXEMPT_ROUTES = [
  '/legal/',       // Páginas legales
  '/auth',         // Auth callback y logout
  '/terms',        // Términos legacy
  '/privacy',      // Privacy legacy
  '/data-deletion',
];

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = [
  '/',
  '/marketplace',
  '/marketplace/creator/',
  '/marketplace/org/',
  '/marketplace/campaigns',
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
  '/book/',
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
  const { user, loading: authLoading } = useAuth();
  const { isComplete, isLoading: gateLoading, currentStep } = useOnboardingGate();

  // Verificar si la ruta está exenta
  const isExemptRoute = useMemo(() => {
    const path = location.pathname;

    // Rutas explícitamente exentas
    if (EXEMPT_ROUTES.some(route => path.startsWith(route))) {
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

  // Si el onboarding no está completo, mostrar el wizard
  // BLOQUEA toda la app hasta completar
  if (!isComplete && currentStep !== 'complete') {
    return <OnboardingWizard />;
  }

  // Onboarding completo, renderizar la app normalmente
  return <>{children}</>;
}

function OnboardingLoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

export default OnboardingGateProvider;
