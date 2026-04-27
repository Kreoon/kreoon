/**
 * AuthStoreBridge
 *
 * Este componente sincroniza el estado del AuthProvider (Context)
 * con el authStore de Zustand.
 *
 * Permite una migración gradual:
 * - Componentes existentes siguen usando useAuth()
 * - Componentes nuevos pueden usar useAuthStore() directamente
 * - Ambos tienen el mismo estado
 *
 * USO:
 * Colocar dentro del AuthProvider en App.tsx:
 *
 * <AuthProvider>
 *   <AuthStoreBridge />
 *   {children}
 * </AuthProvider>
 */
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from './authStore';

export function AuthStoreBridge() {
  const auth = useAuth();
  const syncFromProvider = useAuthStore((s) => s.syncFromProvider);

  // Sincronizar estado del Context → Zustand
  useEffect(() => {
    syncFromProvider({
      user: auth.user,
      session: auth.session,
      profile: auth.profile,
      roles: auth.roles,
      activeRole: auth.activeRole,
      loading: auth.loading,
      rolesLoaded: auth.rolesLoaded,
      isPlatformAdmin: auth.isPlatformAdmin,
      isSuperadmin: auth.isSuperadmin,
    });
  }, [
    auth.user,
    auth.session,
    auth.profile,
    auth.roles,
    auth.activeRole,
    auth.loading,
    auth.rolesLoaded,
    auth.isPlatformAdmin,
    auth.isSuperadmin,
    syncFromProvider,
  ]);

  // Este componente no renderiza nada
  return null;
}
