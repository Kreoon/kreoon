import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  // Keep latest values accessible inside auth listeners (effect has [] deps).
  const userIdRef = useRef<string | null>(null);
  const rolesLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user]);

  useEffect(() => {
    rolesLoadedRef.current = rolesLoaded;
  }, [rolesLoaded]);

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

      // CRITICAL: Ignore any event that is purely a token refresh / visibility focus, 
      // when the user ID hasn't changed. This prevents global loading spinners that 
      // feel like a full-page reload on tab switch.
      const nextUserId = nextSession?.user?.id ?? null;
      const currentUserId = userIdRef.current;
      const userChanged = nextUserId !== currentUserId;

      // If there is no session AND the event is NOT an explicit sign-out, ignore.
      // Browsers (especially mobile) can emit transient null session events on focus.
      if (!nextSession && event !== 'SIGNED_OUT') {
        return;
      }

      // If the same user and roles are already loaded, skip blocking UI entirely.
      // Just silently refresh profile/roles in background if needed.
      if (!userChanged && rolesLoadedRef.current && nextSession?.user) {
        // Silently refresh user data without any loading state change
        setSession(nextSession);
        setUser(nextSession.user);
        window.setTimeout(() => {
          fetchUserData(nextSession.user.id, true); // silent = true
        }, 0);
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        // Only block the UI when the user *actually changed* or first bootstrap.
        const shouldBlockUi = userChanged || !rolesLoadedRef.current;

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
      const [profileResult, rolesResult] = await Promise.all([
        // Profile row might not exist (or RLS could block); don't hard-fail auth boot.
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId)
      ]);

      if (profileResult.error) {
        console.warn('[auth] profile fetch error', profileResult.error);
      }
      if (rolesResult.error) {
        console.warn('[auth] roles fetch error', rolesResult.error);
      }

      setProfile((profileResult.data as Profile) ?? null);
      setRoles((rolesResult.data || []).map(r => r.role as AppRole));
    } catch (error) {
      console.error('[auth] Error fetching user data:', error);
    } finally {
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
      // Insert role for the new user
      await supabase.from('user_roles').insert({
        user_id: data.user.id,
        role: role
      });

      // If client role and company name provided, create the client record
      if (role === 'client' && companyName) {
        await supabase.from('clients').insert({
          name: companyName,
          user_id: data.user.id,
          contact_email: email,
          created_by: data.user.id
        });
      }
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole('admin');
  const isCreator = hasRole('creator');
  const isEditor = hasRole('editor');
  const isClient = hasRole('client');
  const isAmbassador = hasRole('ambassador');
  const isStrategist = hasRole('strategist');

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      roles,
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
