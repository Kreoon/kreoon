/**
 * Auth Store - Zustand
 *
 * Este store coexiste con AuthProvider durante la migración.
 * Los componentes nuevos pueden usar este store directamente,
 * mientras que los existentes siguen usando useAuth().
 *
 * El AuthProvider sincroniza su estado con este store.
 */
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { User, Session } from '@supabase/supabase-js';
import type { AppRole, Profile, UserType, AccountType } from '@/types/database';
import type { PermissionGroup } from '@/lib/permissionGroups';
import { getPermissionGroup } from '@/lib/permissionGroups';

interface AuthState {
  // Core auth state
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  activeRole: AppRole | null;

  // Loading states
  loading: boolean;
  rolesLoaded: boolean;

  // Admin flags
  isPlatformAdmin: boolean;
  isSuperadmin: boolean;
}

interface AuthActions {
  // Setters for AuthProvider to sync state
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setRoles: (roles: AppRole[]) => void;
  setActiveRole: (role: AppRole | null) => void;
  setLoading: (loading: boolean) => void;
  setRolesLoaded: (loaded: boolean) => void;
  setIsPlatformAdmin: (isPlatformAdmin: boolean) => void;
  setIsSuperadmin: (isSuperadmin: boolean) => void;

  // Batch update for performance
  syncFromProvider: (state: Partial<AuthState>) => void;

  // Reset state on logout
  reset: () => void;
}

interface AuthComputed {
  // Computed/derived state (accessed via selectors)
  permissionGroup: PermissionGroup | null;
  isAdmin: boolean;
  isCreator: boolean;
  isEditor: boolean;
  isClient: boolean;
  isStrategist: boolean;
  isTrafficker: boolean;
  isTeamLeader: boolean;
  userType: UserType;
  isTalent: boolean;
  accountType: AccountType | null;
  hasRole: (role: AppRole) => boolean;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  roles: [],
  activeRole: null,
  loading: true,
  rolesLoaded: false,
  isPlatformAdmin: false,
  isSuperadmin: false,
};

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        // Individual setters
        setUser: (user) => set({ user }),
        setSession: (session) => set({ session }),
        setProfile: (profile) => set({ profile }),
        setRoles: (roles) => set({ roles }),
        setActiveRole: (activeRole) => set({ activeRole }),
        setLoading: (loading) => set({ loading }),
        setRolesLoaded: (rolesLoaded) => set({ rolesLoaded }),
        setIsPlatformAdmin: (isPlatformAdmin) => set({ isPlatformAdmin }),
        setIsSuperadmin: (isSuperadmin) => set({ isSuperadmin }),

        // Batch update for syncing from AuthProvider
        syncFromProvider: (state) => set(state),

        // Reset on logout
        reset: () => set(initialState),
      }),
      {
        name: 'kreoon-auth-store',
        // Only persist essential data, not loading states
        partialize: (state) => ({
          activeRole: state.activeRole,
        }),
      }
    )
  )
);

// ============================================
// SELECTORES DERIVADOS (Computed state)
// ============================================
// Estos selectores calculan valores derivados del estado base.
// Usar selectores evita re-renders innecesarios.

/**
 * Obtiene el grupo de permisos del rol activo
 */
export const usePermissionGroup = () =>
  useAuthStore((s) => s.activeRole ? getPermissionGroup(s.activeRole) : null);

/**
 * Verifica si el usuario es admin
 */
export const useIsAdmin = () =>
  useAuthStore((s) => {
    const group = s.activeRole ? getPermissionGroup(s.activeRole) : null;
    return group === 'admin';
  });

/**
 * Verifica si el usuario es talent (creator, editor, strategist, etc.)
 */
export const useIsTalent = () =>
  useAuthStore((s) => {
    const group = s.activeRole ? getPermissionGroup(s.activeRole) : null;
    return group === 'talent';
  });

/**
 * Verifica si el usuario es client
 */
export const useIsClient = () =>
  useAuthStore((s) => {
    const group = s.activeRole ? getPermissionGroup(s.activeRole) : null;
    return group === 'client';
  });

/**
 * Obtiene el tipo de usuario basado en sus roles
 */
export const useUserType = () =>
  useAuthStore((s): UserType => {
    if (s.roles.length === 0) return 'talent';
    const groups = s.roles.map(r => getPermissionGroup(r));
    if (groups.includes('admin')) return 'admin';
    if (groups.includes('client')) return 'client';
    return 'talent';
  });

/**
 * Verifica si el usuario tiene un rol específico
 */
export const useHasRole = (role: AppRole) =>
  useAuthStore((s) => s.roles.includes(role));

/**
 * Obtiene el account type del profile
 */
export const useAccountType = () =>
  useAuthStore((s): AccountType | null =>
    (s.profile?.user_type as AccountType) || null
  );

/**
 * Verifica si está cargando
 */
export const useIsLoading = () =>
  useAuthStore((s) => s.loading);

/**
 * Verifica si los roles ya se cargaron
 */
export const useRolesLoaded = () =>
  useAuthStore((s) => s.rolesLoaded);

/**
 * Obtiene el ID de la organización actual
 */
export const useCurrentOrganizationId = () =>
  useAuthStore((s) => s.profile?.current_organization_id || null);

/**
 * Obtiene el user ID
 */
export const useUserId = () =>
  useAuthStore((s) => s.user?.id || null);

// ============================================
// HOOKS DE CONVENIENCIA
// ============================================

/**
 * Hook que devuelve todo el estado de auth (para migración gradual)
 * Similar a useAuth() pero desde Zustand
 */
export function useAuthState() {
  const state = useAuthStore();
  const permissionGroup = state.activeRole ? getPermissionGroup(state.activeRole) : null;

  // Computed values
  const isAdmin = permissionGroup === 'admin';
  const isTalentGroup = permissionGroup === 'talent';
  const isClient = permissionGroup === 'client';

  const getUserTypeFromRoles = (): UserType => {
    if (state.roles.length === 0) return 'talent';
    const groups = state.roles.map(r => getPermissionGroup(r));
    if (groups.includes('admin')) return 'admin';
    if (groups.includes('client')) return 'client';
    return 'talent';
  };

  return {
    ...state,
    permissionGroup,
    isAdmin,
    isCreator: isTalentGroup,
    isEditor: isTalentGroup,
    isClient,
    isStrategist: isTalentGroup,
    isTrafficker: isTalentGroup,
    isTeamLeader: isAdmin,
    userType: getUserTypeFromRoles(),
    isTalent: getUserTypeFromRoles() === 'talent',
    accountType: (state.profile?.user_type as AccountType) || null,
    hasRole: (role: AppRole) => state.roles.includes(role),
  };
}
