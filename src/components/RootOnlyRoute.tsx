/**
 * RootOnlyRoute Component
 *
 * Componente de protección que restringe el acceso a rutas
 * solo para el usuario root (jacsolucionesgraficas@gmail.com).
 *
 * Si el usuario no es root, redirige automáticamente a /dashboard.
 */

import { ReactNode, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { canAccessDevModule } from '@/lib/developmentModules';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RootOnlyRouteProps {
  /** Contenido a renderizar si el usuario es root */
  children: ReactNode;
  /** Ruta a la que redirigir si no es root (default: /dashboard) */
  fallbackPath?: string;
}

/**
 * Protege rutas que solo el usuario root puede acceder.
 * Muestra un loading mientras verifica la autenticación.
 * Redirige a fallbackPath si el usuario no es root.
 */
export function RootOnlyRoute({ children, fallbackPath = '/dashboard' }: RootOnlyRouteProps) {
  const { user, loading } = useAuth();
  const toastShown = useRef(false);

  // Verificar acceso (puede ser false si no hay user)
  const hasAccess = user ? canAccessDevModule(user.email) : false;

  // Mostrar toast cuando no tiene acceso (antes de redirigir)
  useEffect(() => {
    if (user && !loading && !hasAccess && !toastShown.current) {
      toastShown.current = true;
      toast.info('Módulo en desarrollo', {
        description: 'Esta sección solo está disponible para administradores root'
      });
    }
  }, [user, loading, hasAccess]);

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir a auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Si no es root, redirigir al dashboard
  if (!hasAccess) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Usuario root - renderizar contenido
  return <>{children}</>;
}
