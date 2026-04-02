/**
 * RoleLegalGateProvider - Provider para gestionar documentos legales por rol
 *
 * Este provider detecta cuando un usuario recibe un nuevo rol que requiere
 * documentos legales adicionales y muestra un modal bloqueante hasta que
 * se firmen todos los documentos requeridos.
 *
 * Escucha cambios en:
 * - organization_member_roles: Cuando un admin asigna rol en una organizacion
 * - creator_profiles: Cuando un freelancer crea su perfil de creador
 *
 * Roles que activan el gate:
 * - creator: Acuerdo de Creador (cesion perpetua de imagen a KREOON)
 * - editor: Acuerdo de Creador (cesion perpetua de imagen a KREOON)
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRoleLegalGate, RoleGateDocument } from '@/hooks/useRoleLegalGate';
import { RoleLegalConsentModal } from '@/components/legal/RoleLegalConsentModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RoleLegalGateContextValue {
  /**
   * Verificar si un rol tiene documentos pendientes
   */
  checkRoleGate: (role: string) => Promise<boolean>;

  /**
   * Mostrar el modal de consentimiento para un rol especifico
   */
  showRoleGate: (role: string) => void;

  /**
   * Si hay un modal de rol activo
   */
  isRoleGateOpen: boolean;

  /**
   * El rol actual que esta siendo gestionado
   */
  currentGateRole: string | null;
}

const RoleLegalGateContext = createContext<RoleLegalGateContextValue | null>(null);

export function useRoleLegalGateContext() {
  const context = useContext(RoleLegalGateContext);
  if (!context) {
    throw new Error('useRoleLegalGateContext must be used within RoleLegalGateProvider');
  }
  return context;
}

interface RoleLegalGateProviderProps {
  children: ReactNode;
}

export function RoleLegalGateProvider({ children }: RoleLegalGateProviderProps) {
  const { user } = useAuth();

  const [currentGateRole, setCurrentGateRole] = useState<string | null>(null);
  const [gateDocuments, setGateDocuments] = useState<RoleGateDocument[]>([]);
  const [gateTitle, setGateTitle] = useState<string>('');
  const [gateDescription, setGateDescription] = useState<string>('');
  const [isRoleGateOpen, setIsRoleGateOpen] = useState(false);

  // Usar el hook para el rol actual
  const {
    hasPendingDocuments,
    pendingDocuments,
    gateTitle: hookGateTitle,
    gateDescription: hookGateDescription,
    refetch,
  } = useRoleLegalGate(currentGateRole || undefined);

  // Sincronizar datos cuando cambia el rol
  useEffect(() => {
    if (currentGateRole && hasPendingDocuments) {
      setGateDocuments(pendingDocuments);
      setGateTitle(hookGateTitle || 'Documentos Requeridos');
      setGateDescription(hookGateDescription || '');
    }
  }, [currentGateRole, hasPendingDocuments, pendingDocuments, hookGateTitle, hookGateDescription]);

  // Verificar si un rol tiene documentos pendientes
  const checkRoleGate = useCallback(async (role: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase.rpc('check_role_legal_gate', {
        p_user_id: user.id,
        p_role: role,
      });

      if (error) {
        // Si la funcion no existe, asumir que no hay gate
        if (error.code === 'PGRST202' || error.message?.includes('Could not find')) {
          return false;
        }
        console.error('[RoleLegalGateProvider] Error checking gate:', error);
        return false;
      }

      const result = Array.isArray(data) ? data[0] : data;
      return result?.has_pending_documents ?? false;
    } catch (e) {
      console.error('[RoleLegalGateProvider] Exception checking gate:', e);
      return false;
    }
  }, [user?.id]);

  // Mostrar el modal de consentimiento para un rol
  const showRoleGate = useCallback(async (role: string) => {
    if (!user?.id) return;

    setCurrentGateRole(role);

    // Cargar documentos para el rol
    try {
      const { data, error } = await supabase.rpc('get_role_gate_documents', {
        p_user_id: user.id,
        p_role: role,
      });

      if (error) {
        console.error('[RoleLegalGateProvider] Error loading documents:', error);
        toast.error('Error cargando documentos legales');
        return;
      }

      if (data && data.length > 0) {
        setGateDocuments(data as RoleGateDocument[]);
        setGateTitle(data[0].gate_title || 'Documentos Requeridos');
        setGateDescription(data[0].gate_description || '');
        setIsRoleGateOpen(true);
      }
    } catch (e) {
      console.error('[RoleLegalGateProvider] Exception loading documents:', e);
      toast.error('Error cargando documentos legales');
    }
  }, [user?.id]);

  // Manejar completado del gate
  const handleGateComplete = useCallback(() => {
    setIsRoleGateOpen(false);
    setCurrentGateRole(null);
    setGateDocuments([]);
    refetch();
    toast.success('Documentos completados correctamente');
  }, [refetch]);

  // Suscribirse a cambios en los roles del usuario (organizaciones y freelancers)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('role-legal-gate-changes')
      // Suscripcion para roles en organizaciones
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'organization_member_roles',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newRole = payload.new?.role as string;
          if (newRole) {
            // Verificar si este rol tiene documentos pendientes
            const hasPending = await checkRoleGate(newRole);
            if (hasPending) {
              // Esperar un momento para que la UI se actualice
              setTimeout(() => {
                showRoleGate(newRole);
              }, 500);
            }
          }
        }
      )
      // Suscripcion para freelancers que crean perfil de creador
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'creator_profiles',
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          // Freelancer creo perfil de creador - verificar documentos pendientes
          const hasPending = await checkRoleGate('creator');
          if (hasPending) {
            setTimeout(() => {
              showRoleGate('creator');
            }, 500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, checkRoleGate, showRoleGate]);

  const contextValue: RoleLegalGateContextValue = {
    checkRoleGate,
    showRoleGate,
    isRoleGateOpen,
    currentGateRole,
  };

  return (
    <RoleLegalGateContext.Provider value={contextValue}>
      {children}

      {/* Modal de consentimiento por rol */}
      <RoleLegalConsentModal
        isOpen={isRoleGateOpen}
        onComplete={handleGateComplete}
        targetRole={currentGateRole || ''}
        gateTitle={gateTitle}
        gateDescription={gateDescription}
        documents={gateDocuments}
        isBlocking={true}
      />
    </RoleLegalGateContext.Provider>
  );
}

export default RoleLegalGateProvider;
