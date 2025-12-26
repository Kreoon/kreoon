import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppRole, Profile } from '@/types/database';

// Root admin email - only this user can impersonate
const ROOT_ADMIN_EMAIL = 'jacsolucionesgraficas@gmail.com';

export interface ImpersonationTarget {
  clientId: string | null;
  clientName: string | null;
  role: AppRole | null;
  userId: string | null;
  userName: string | null;
}

interface ImpersonationContextType {
  // Whether the current user is root admin
  isRootAdmin: boolean;
  
  // Active impersonation state
  isImpersonating: boolean;
  impersonationTarget: ImpersonationTarget;
  
  // The effective roles/permissions to use (real or impersonated)
  effectiveRoles: AppRole[];
  effectiveClientId: string | null;
  effectiveUserId: string | null;
  
  // Read-only mode when impersonating
  isReadOnlyMode: boolean;
  
  // Actions
  startImpersonation: (target: ImpersonationTarget) => Promise<void>;
  stopImpersonation: () => void;
  
  // Helpers
  canPerformAction: (action: string) => boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

interface ClientInfo {
  id: string;
  name: string;
}

interface UserInfo {
  id: string;
  full_name: string;
  email: string;
  roles: AppRole[];
}

export interface ImpersonationData {
  clients: ClientInfo[];
  users: UserInfo[];
  loading: boolean;
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user, profile, roles: realRoles } = useAuth();
  
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonationTarget, setImpersonationTarget] = useState<ImpersonationTarget>({
    clientId: null,
    clientName: null,
    role: null,
    userId: null,
    userName: null,
  });

  // Check if current user is root admin
  const isRootAdmin = profile?.email === ROOT_ADMIN_EMAIL;

  // Calculate effective values based on impersonation state
  const effectiveRoles: AppRole[] = isImpersonating && impersonationTarget.role 
    ? [impersonationTarget.role] 
    : realRoles;
    
  const effectiveClientId = isImpersonating 
    ? impersonationTarget.clientId 
    : null;
    
  const effectiveUserId = isImpersonating && impersonationTarget.userId 
    ? impersonationTarget.userId 
    : user?.id ?? null;

  // Read-only mode disabled - root admin can make full changes while impersonating
  const isReadOnlyMode = false;

  const startImpersonation = useCallback(async (target: ImpersonationTarget) => {
    if (!isRootAdmin) {
      console.error('[impersonation] Only root admin can impersonate');
      return;
    }

    // Log the impersonation start
    try {
      await supabase.rpc('log_activity', {
        _user_id: user?.id,
        _action: 'impersonation_started',
        _entity_type: 'impersonation',
        _entity_id: target.userId || target.clientId || null,
        _entity_name: target.userName || target.clientName || target.role || 'unknown',
        _details: {
          target_client_id: target.clientId,
          target_client_name: target.clientName,
          target_role: target.role,
          target_user_id: target.userId,
          target_user_name: target.userName,
        }
      });
    } catch (err) {
      console.warn('[impersonation] Failed to log impersonation start:', err);
    }

    setImpersonationTarget(target);
    setIsImpersonating(true);
    
    // Store in session storage for persistence during page refresh
    sessionStorage.setItem('impersonation', JSON.stringify(target));
  }, [isRootAdmin, user?.id]);

  const stopImpersonation = useCallback(() => {
    // Log impersonation end
    if (user?.id && isImpersonating) {
      (async () => {
        try {
          await supabase.rpc('log_activity', {
            _user_id: user.id,
            _action: 'impersonation_ended',
            _entity_type: 'impersonation',
            _entity_id: impersonationTarget.userId || impersonationTarget.clientId || null,
            _entity_name: impersonationTarget.userName || impersonationTarget.clientName || impersonationTarget.role || 'unknown',
            _details: null
          });
        } catch (err) {
          console.warn('[impersonation] Failed to log impersonation end:', err);
        }
      })();
    }

    setImpersonationTarget({
      clientId: null,
      clientName: null,
      role: null,
      userId: null,
      userName: null,
    });
    setIsImpersonating(false);
    sessionStorage.removeItem('impersonation');
  }, [user?.id, isImpersonating, impersonationTarget]);

  // Check if an action can be performed (blocked in read-only mode)
  const canPerformAction = useCallback((action: string): boolean => {
    if (!isReadOnlyMode) return true;
    
    // In read-only mode, block all write actions
    const blockedActions = [
      'create', 'update', 'delete', 'approve', 'reject', 
      'assign', 'pay', 'submit', 'save', 'upload', 'send'
    ];
    
    return !blockedActions.some(blocked => 
      action.toLowerCase().includes(blocked)
    );
  }, [isReadOnlyMode]);

  // Restore impersonation state from session storage on mount
  useEffect(() => {
    if (isRootAdmin) {
      const stored = sessionStorage.getItem('impersonation');
      if (stored) {
        try {
          const target = JSON.parse(stored) as ImpersonationTarget;
          setImpersonationTarget(target);
          setIsImpersonating(true);
        } catch (err) {
          console.warn('[impersonation] Failed to restore state:', err);
          sessionStorage.removeItem('impersonation');
        }
      }
    } else {
      // Clear impersonation if user is not root admin
      setImpersonationTarget({
        clientId: null,
        clientName: null,
        role: null,
        userId: null,
        userName: null,
      });
      setIsImpersonating(false);
      sessionStorage.removeItem('impersonation');
    }
  }, [isRootAdmin]);

  return (
    <ImpersonationContext.Provider value={{
      isRootAdmin,
      isImpersonating,
      impersonationTarget,
      effectiveRoles,
      effectiveClientId,
      effectiveUserId,
      isReadOnlyMode,
      startImpersonation,
      stopImpersonation,
      canPerformAction,
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}

// Hook to fetch impersonation data (clients, users)
export function useImpersonationData(): ImpersonationData {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { isRootAdmin } = useImpersonation();

  useEffect(() => {
    if (!isRootAdmin) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all clients
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name')
          .order('name');

        // Fetch all users with their roles
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name');

        // Fetch all user roles
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('user_id, role');

        // Map roles to users
        const rolesMap = new Map<string, AppRole[]>();
        rolesData?.forEach(r => {
          const existing = rolesMap.get(r.user_id) || [];
          rolesMap.set(r.user_id, [...existing, r.role as AppRole]);
        });

        setClients(clientsData || []);
        setUsers((profilesData || []).map(p => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          roles: rolesMap.get(p.id) || []
        })));
      } catch (err) {
        console.error('[impersonation] Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isRootAdmin]);

  return { clients, users, loading };
}
