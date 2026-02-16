import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, Profile } from '@/types/database';
import { getPermissionGroup, type PermissionGroup } from '@/lib/permissionGroups';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  activeRole: AppRole | null;
  permissionGroup: PermissionGroup | null;
  setActiveRole: (role: AppRole) => void;
  loading: boolean;
  rolesLoaded: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: AppRole, companyName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isCreator: boolean;
  isEditor: boolean;
  isClient: boolean;
  isStrategist: boolean;
  isTrafficker: boolean;
  isTeamLeader: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage key for active role
const ACTIVE_ROLE_STORAGE_KEY = 'activeRole';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  // Keep latest values accessible inside auth listeners (effect has [] deps).
  const userIdRef = useRef<string | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const rolesLoadedRef = useRef<boolean>(false);
  const bootstrappedRef = useRef<boolean>(false);
  const bootTimeoutRef = useRef<number | null>(null);
  const fetchInProgressRef = useRef<string | null>(null);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
    sessionTokenRef.current = session?.access_token ?? null;
  }, [user, session]);

  useEffect(() => {
    rolesLoadedRef.current = rolesLoaded;
  }, [rolesLoaded]);

  // When roles change, set activeRole from profile DB, localStorage, or default
  useEffect(() => {
    if (roles.length > 0) {
      // Priority: 1) profile.active_role from DB (ALWAYS trust this first), 2) admin check, 3) localStorage, 4) default
      const dbRole = (profile as any)?.active_role as AppRole | null;
      const storedRole = localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY) as AppRole | null;

      // CRITICAL FIX: Always prioritize the DB role if it exists and is valid.
      // This ensures that when a creator logs in, they see the creator view
      // even if localStorage has 'admin' from a previous session.
      if (dbRole && roles.includes(dbRole)) {
        setActiveRoleState(dbRole);
        localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, dbRole);
      } else if (roles.includes('admin')) {
        // Admin users default to admin to avoid accidentally loading scoped views.
        setActiveRoleState('admin');
        localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, 'admin');
      } else if (storedRole && roles.includes(storedRole)) {
        // Only use localStorage if it matches a valid role for this user
        setActiveRoleState(storedRole);
      } else {
        // Default to first role by priority (group-based)
        const groupPriority: PermissionGroup[] = ['admin', 'team_leader', 'strategist', 'editor', 'creator', 'client'];
        const primaryRole = groupPriority
          .map(g => roles.find(r => getPermissionGroup(r) === g))
          .find(Boolean) || roles[0];
        setActiveRoleState(primaryRole);
        localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, primaryRole);
      }
    } else {
      setActiveRoleState(null);
    }
  }, [roles, profile]);

  const setActiveRole = async (role: AppRole) => {
    if (roles.includes(role)) {
      setActiveRoleState(role);
      localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, role);
      
      // Persist to database
      if (user?.id) {
        supabase
          .from('profiles')
          .update({ active_role: role })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) console.warn('[auth] Failed to persist active_role:', error);
          });
      }
      
      // Dispatch event for components that need to react to role change
      window.dispatchEvent(new CustomEvent('active-role-changed', { detail: { role } }));
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Mobile browsers can sometimes block storage/cookies and auth bootstrapping never resolves.
    // This prevents an infinite spinner by timing out to the login screen.
    // IMPORTANT: Don't clear this timeout just because getSession resolved; only clear when bootstrapping finishes.
    bootTimeoutRef.current = window.setTimeout(() => {
      if (!isMounted) return;
      console.warn('[auth] bootstrap timeout');
      setRolesLoaded(true);
      setLoading(false);
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      console.log('[auth] state change', event);

      // CRITICAL: Treat same-user events (often triggered on tab focus / token refresh)
      // as a silent refresh. We should never re-block the entire UI in that case.
      const nextUserId = nextSession?.user?.id ?? null;
      const currentUserId = userIdRef.current;
      const userChanged = nextUserId !== currentUserId;
      const sameUser = !!nextUserId && nextUserId === currentUserId;

      // If there is no session AND the event is NOT an explicit sign-out, ignore.
      // Browsers (especially mobile) can emit transient null session events on focus.
      if (!nextSession && event !== 'SIGNED_OUT') {
        return;
      }

      // If we already bootstrapped and it's the same user, never show global loading.
      // Also avoid setting user/session state if nothing meaningful changed to prevent UI flicker.
      // Supabase client already manages refreshed tokens internally.
      if (sameUser && bootstrappedRef.current && nextSession?.user) {
        const nextToken = nextSession.access_token ?? null;
        const currentToken = sessionTokenRef.current;

        // Only update state if token changed (rare). Otherwise, keep UI stable.
        if (nextToken && nextToken !== currentToken) {
          setSession(nextSession);
          setUser(nextSession.user);
        }

        window.setTimeout(() => {
          fetchUserData(nextSession.user.id, true);
        }, 0);
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        // Only block the UI on first bootstrap or when the user actually changes.
        const shouldBlockUi = userChanged && !bootstrappedRef.current ? true : userChanged;

        if (shouldBlockUi) {
          setLoading(true);
          setRolesLoaded(false);
        }

        window.setTimeout(() => {
          fetchUserData(nextSession.user.id, !shouldBlockUi);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
        setRolesLoaded(true);
        setLoading(false);
        if (bootTimeoutRef.current) {
          window.clearTimeout(bootTimeoutRef.current);
          bootTimeoutRef.current = null;
        }
      }
    });

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        console.log('[auth] getSession resolved', !!session);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          window.setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setRolesLoaded(true);
          setLoading(false);
          if (bootTimeoutRef.current) {
            window.clearTimeout(bootTimeoutRef.current);
            bootTimeoutRef.current = null;
          }
        }
      })
      .catch((err) => {
        console.error('[auth] getSession error', err);
        if (!isMounted) return;
        setRolesLoaded(true);
        setLoading(false);
        if (bootTimeoutRef.current) {
          window.clearTimeout(bootTimeoutRef.current);
          bootTimeoutRef.current = null;
        }
      });

    return () => {
      isMounted = false;
      if (bootTimeoutRef.current) {
        window.clearTimeout(bootTimeoutRef.current);
        bootTimeoutRef.current = null;
      }
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (userId: string, silent = false) => {
    // Dedup: skip if a non-silent fetch is already in progress for the same user
    // Silent refreshes always skip if there's already a fetch running
    if (fetchInProgressRef.current === userId) {
      if (silent) return;
      // Non-silent: wait briefly for the in-progress fetch to finish
      await new Promise(r => setTimeout(r, 100));
      if (fetchInProgressRef.current === userId) return;
    }
    fetchInProgressRef.current = userId;

    // Helper to add timeout to promises
    const withTimeout = <T,>(promiseFn: () => PromiseLike<T>, ms: number): Promise<T> => {
      return Promise.race([
        Promise.resolve(promiseFn()),
        new Promise<T>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), ms)
        )
      ]);
    };

    // Root admin emails for fallback lookup
    const ROOT_EMAILS = ["jacsolucionesgraficas@gmail.com", "kairosgp.sas@gmail.com"];
    
    try {
      // First fetch profile to get current_organization_id (with 20s timeout)
      let profileResult = await withTimeout(
        () =>
          supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle(),
        20000
      );

      if (profileResult.error) {
        console.warn('[auth] profile fetch error', profileResult.error);
      }

      let userProfile = profileResult.data as Profile | null;

      // FALLBACK: If profile not found by ID, check if this is a root admin by email
      // This handles ID mismatch issues from project migrations
      if (!userProfile) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const userEmail = authUser?.email;
        
        if (userEmail && ROOT_EMAILS.includes(userEmail)) {
          console.log('[auth] Profile not found by ID, trying email lookup for root admin');
          const emailProfileResult = await withTimeout(
            () =>
              supabase
                .from('profiles')
                .select('*')
                .eq('email', userEmail)
                .maybeSingle(),
            10000
          );
          
          if (emailProfileResult.data) {
            userProfile = emailProfileResult.data as Profile;
            console.log('[auth] Found root admin profile by email');
          }
        }
      }

      // IMPORTANT: On silent refresh (tab focus / token refresh), do not clear existing
      // profile/roles if the fetch returns null or errors. This prevents visible UI flicker.
      if (!silent || userProfile) {
        setProfile(userProfile);
      }

      // Fetch roles from organization_member_roles.
      // Prefer the current organization context, but if current_organization_id is null
      // (common when user is currently acting as a client), fall back to ANY org roles
      // so multi-role users can still switch roles.
      let userRoles: AppRole[] = [];

      // IMPORTANT: Use profile ID for role lookups if profile was found by email (ID mismatch scenario)
      const roleUserId = userProfile?.id || userId;

      const fetchOrgRoles = async (organizationId?: string) => {
        const q = supabase
          .from('organization_member_roles')
          .select('role')
          .eq('user_id', roleUserId);

        return organizationId ? q.eq('organization_id', organizationId) : q;
      };

      if (userProfile?.current_organization_id) {
        const memberRolesResult = await withTimeout(
          () => fetchOrgRoles(userProfile.current_organization_id),
          8000
        );

        if (memberRolesResult.error) {
          console.warn('[auth] org member roles fetch error', memberRolesResult.error);
        }

        if (memberRolesResult.data && memberRolesResult.data.length > 0) {
          userRoles = memberRolesResult.data.map((r) => r.role as AppRole);
        } else {
          // Fallback to organization_members single role for backward compatibility
          const memberResult = await withTimeout(
            () =>
              supabase
                .from('organization_members')
                .select('role')
                .eq('user_id', roleUserId)
                .eq('organization_id', userProfile.current_organization_id)
                .maybeSingle(),
            8000
          );

          if (memberResult.data?.role) {
            userRoles = [memberResult.data.role as AppRole];
          }
        }
      } else {
        // No org selected in profile — still include org-based roles to allow role switching.
        const anyOrgRolesResult = await withTimeout(
          () => fetchOrgRoles(),
          8000
        );

        if (anyOrgRolesResult.error) {
          console.warn('[auth] org member roles (any org) fetch error', anyOrgRolesResult.error);
        }

        if (anyOrgRolesResult.data && anyOrgRolesResult.data.length > 0) {
          userRoles = anyOrgRolesResult.data.map((r) => r.role as AppRole);
        } else {
          // Backward-compatible fallback: some installations still store a single role
          // on organization_members. If user has no current org selected, still load
          // any roles they may have there so the RoleSwitcher can appear.
          const anyMemberRolesResult = await withTimeout(
            () =>
              supabase
                .from('organization_members')
                .select('role')
                .eq('user_id', roleUserId)
                .limit(50),
            8000
          );

          if (anyMemberRolesResult.error) {
            console.warn('[auth] organization_members (any org) fetch error', anyMemberRolesResult.error);
          }

          if (anyMemberRolesResult.data && anyMemberRolesResult.data.length > 0) {
            userRoles = anyMemberRolesResult.data
              .map((r) => (r as any).role as AppRole)
              .filter(Boolean);
          }
        }
      }

      // Dedupe roles defensively
      userRoles = Array.from(new Set(userRoles));

      // ALWAYS check if user is in client_users table - they should have client role
      // This runs regardless of other roles to ensure multi-role users get client access
      if (!userRoles.includes('client')) {
        try {
          const clientUserResult = await withTimeout(
            () =>
              supabase
                .from('client_users')
                .select('id')
                .eq('user_id', roleUserId)
                .limit(1),
            8000
          );

          if (clientUserResult.error) {
            console.warn('[auth] client_users fetch error:', clientUserResult.error);
          }

          if (clientUserResult.data && clientUserResult.data.length > 0) {
            // User is a client user, add client role
            userRoles = [...userRoles, 'client'];
            console.log('[auth] Added client role for user in client_users table');
          }
        } catch (err) {
          console.warn('[auth] Error checking client_users:', err);
        }
      }

      // Fallback: check user_roles for platform-level admin (root admin)
      // This ensures the root admin still has access even without org membership
      if (userRoles.length === 0) {
        const rolesResult = await withTimeout(
          () =>
            supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', roleUserId),
          8000
        );

        userRoles = (rolesResult.data || []).map((r) => r.role as AppRole);
      }
      
      // FINAL FALLBACK: If still no roles and this is a root admin, grant admin role
      if (userRoles.length === 0 && userProfile?.email && ROOT_EMAILS.includes(userProfile.email)) {
        console.log('[auth] Root admin detected with no roles, granting admin role');
        userRoles = ['admin'];
      }

      // CRITICAL FALLBACK: If still no roles but profile has active_role, use that
      // This handles cases where RLS queries fail but the profile was loaded successfully
      const profileActiveRole = (userProfile as any)?.active_role as AppRole | null;
      if (userRoles.length === 0 && profileActiveRole) {
        console.log('[auth] No roles found from org tables, using profile.active_role:', profileActiveRole);
        userRoles = [profileActiveRole];
      }

      console.log('[auth] Final roles for user:', userRoles, 'Profile active_role:', profileActiveRole);

      if (!silent || userRoles.length > 0) {
        setRoles(userRoles);
      }
    } catch (error) {
      console.error('[auth] Error fetching user data:', error);

      // On silent refresh, keep the previous profile/roles to avoid flicker.
      if (!silent) {
        // On any error (including timeout), don't block the app - allow it to proceed
        setProfile(null);
        setRoles([]);
      }
    } finally {
      bootstrappedRef.current = true;
      fetchInProgressRef.current = null;

      if (bootTimeoutRef.current) {
        window.clearTimeout(bootTimeoutRef.current);
        bootTimeoutRef.current = null;
      }

      if (!silent) {
        setRolesLoaded(true);
        setLoading(false);
      } else {
        // On silent refresh, just mark roles as loaded if they weren't.
        if (!rolesLoadedRef.current) {
          setRolesLoaded(true);
          setLoading(false);
        }
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, role: AppRole, companyName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });

    if (!error && data.user) {
      // Note: Role assignment for organization members should be done
      // through organization_member_roles when adding to an organization.
      // user_roles is only for platform-level admins (root admins).
      // For now, we skip inserting into user_roles here since roles
      // are managed at the organization level.

      // If client role and company name provided, create the client record
      if (role === 'client' && companyName) {
        const { data: clientData } = await supabase.from('clients').insert({
          name: companyName,
          user_id: data.user.id,
          contact_email: email,
          created_by: data.user.id
        }).select('id').single();

        // Also add user to client_users
        if (clientData) {
          await supabase.from('client_users').insert({
            client_id: clientData.id,
            user_id: data.user.id,
            role: 'owner',
            created_by: data.user.id
          });
        }
      }
    }

    return { error };
  };

  const signOut = async () => {
    localStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY);
    await supabase.auth.signOut();
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  // Permission group for current active role
  const permissionGroup = activeRole ? getPermissionGroup(activeRole) : null;

  // These check permission GROUP, not exact role string.
  // e.g. isCreator is true for 'ugc_creator', 'photographer', etc.
  const isAdmin = permissionGroup === 'admin';
  const isCreator = permissionGroup === 'creator';
  const isEditor = permissionGroup === 'editor';
  const isClient = permissionGroup === 'client';
  const isStrategist = permissionGroup === 'strategist';
  const isTrafficker = permissionGroup === 'strategist'; // trafficker maps to strategist group
  const isTeamLeader = permissionGroup === 'team_leader';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      roles,
      activeRole,
      permissionGroup,
      setActiveRole,
      loading,
      rolesLoaded,
      signIn,
      signUp,
      signOut,
      hasRole,
      isAdmin,
      isCreator,
      isEditor,
      isClient,
      isStrategist,
      isTrafficker,
      isTeamLeader
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Safe version that returns null if outside AuthProvider (for tracking, etc.)
export function useAuthSafe() {
  return useContext(AuthContext) ?? null;
}
