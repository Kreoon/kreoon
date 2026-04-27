/**
 * Kreoon Stores - Zustand
 *
 * Este módulo exporta todos los stores de Zustand de la aplicación.
 * Los stores coexisten con los Context Providers durante la migración.
 */

// Auth Store
export {
  useAuthStore,
  usePermissionGroup,
  useIsAdmin,
  useIsTalent,
  useIsClient,
  useUserType,
  useHasRole,
  useAccountType,
  useIsLoading,
  useRolesLoaded,
  useCurrentOrganizationId,
  useUserId,
  useAuthState,
} from './authStore';

// Bridges (para sincronización con Context Providers)
export { AuthStoreBridge } from './AuthStoreBridge';
