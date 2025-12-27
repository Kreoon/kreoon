import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  activeRole: AppRole | null;
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
  isAmbassador: boolean;
  isStrategist: boolean;
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
  const rolesLoadedRef = useRef<boolean>(false);
  const bootstrappedRef = useRef<boolean>(false);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user]);

  useEffect(() => {
    rolesLoadedRef.current = rolesLoaded;
  }, [rolesLoaded]);

  // When roles change, set activeRole to the stored one or the first available role
  useEffect(() => {
    if (roles.length > 0) {
      const storedRole = localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY) as AppRole | null;
      if (storedRole && roles.includes(storedRole)) {
        setActiveRoleState(storedRole);
      } else {
        // Default to first role (priority: admin > ambassador > strategist > creator > editor > client)
        const priority: AppRole[] = ['admin', 'ambassador', 'strategist', 'creator', 'editor', 'client'];
        const primaryRole = priority.find(r => roles.includes(r)) || roles[0];
        setActiveRoleState(primaryRole);
        localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, primaryRole);
      }
    } else {
      setActiveRoleState(null);
    }
  }, [roles]);

  const setActiveRole = (role: AppRole) => {
    if (roles.includes(role)) {
      setActiveRoleState(role);
      localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, role);
      // Dispatch event for components that need to react to role change
      window.dispatchEvent(new CustomEvent('active-role-changed', { detail: { role } }));
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Mobile browsers can sometimes block storage/cookies and auth bootstrapping never resolves.
    // This prevents an infinite spinner by timing out to the login screen.
    const bootTimeout = window.setTimeout(() => {
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
      // Just keep session/user in sync and refresh profile/roles in the background.
      if (sameUser && bootstrappedRef.current && nextSession?.user) {
        setSession(nextSession);
        setUser(nextSession.user);
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
        }
      })
      .catch((err) => {
        console.error('[auth] getSession error', err);
        if (!isMounted) return;
        setRolesLoaded(true);
        setLoading(false);
      })
      .finally(() => {
        window.clearTimeout(bootTimeout);
      });

    return () => {
      isMounted = false;
      window.clearTimeout(bootTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (userId: string, silent = false) => {
    try {
      // First fetch profile to get current_organization_id
      const profileResult = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileResult.error) {
        console.warn('[auth] profile fetch error', profileResult.error);
      }

      const userProfile = profileResult.data as Profile | null;
      setProfile(userProfile);

      // Now fetch roles from organization_member_roles based on current_organization_id
      let userRoles: AppRole[] = [];
      
      if (userProfile?.current_organization_id) {
        // Fetch multiple roles from the new organization_member_roles table
        const { data: memberRolesData, error: memberRolesError } = await supabase
          .from('organization_member_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('organization_id', userProfile.current_organization_id);

        if (memberRolesError) {
          console.warn('[auth] org member roles fetch error', memberRolesError);
        }

        if (memberRolesData && memberRolesData.length > 0) {
          userRoles = memberRolesData.map(r => r.role as AppRole);
        } else {
          // Fallback to organization_members single role for backward compatibility
          const { data: memberData } = await supabase
            .from('organization_members')
            .select('role')
            .eq('user_id', userId)
            .eq('organization_id', userProfile.current_organization_id)
            .maybeSingle();

          if (memberData?.role) {
            userRoles = [memberData.role as AppRole];
          }
        }
      }

      // Fallback: check user_roles for platform-level admin (root admin)
      // This ensures the root admin still has access even without org membership
      if (userRoles.length === 0) {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);
        
        userRoles = (rolesData || []).map(r => r.role as AppRole);
      }

      setRoles(userRoles);
    } catch (error) {
      console.error('[auth] Error fetching user data:', error);
    } finally {
      bootstrappedRef.current = true;

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
  
  // These now check against activeRole for UI purposes, but hasRole checks all roles
  const isAdmin = activeRole === 'admin';
  const isCreator = activeRole === 'creator';
  const isEditor = activeRole === 'editor';
  const isClient = activeRole === 'client';
  const isAmbassador = activeRole === 'ambassador';
  const isStrategist = activeRole === 'strategist';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      roles,
      activeRole,
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
      isAmbassador,
      isStrategist
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
