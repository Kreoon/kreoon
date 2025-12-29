import { useTrialStatus } from '@/contexts/TrialContext';
import { toast } from 'sonner';
import { useCallback } from 'react';

/**
 * Hook that provides trial-aware action guards.
 * Use this to wrap actions that should be blocked when trial is expired.
 */
export function useTrialGuard() {
  const { isReadOnly, isExpired, billingEnabled, daysRemaining } = useTrialStatus();

  /**
   * Guards an action - shows toast and returns false if trial is expired
   */
  const guardAction = useCallback((action: () => void, actionName?: string) => {
    if (isReadOnly) {
      toast.error('Periodo de prueba expirado', {
        description: 'Activa tu plan para continuar creando y editando contenido.',
        action: {
          label: 'Activar plan',
          onClick: () => window.location.href = '/settings',
        },
      });
      return false;
    }
    action();
    return true;
  }, [isReadOnly]);

  /**
   * Guards an async action
   */
  const guardAsyncAction = useCallback(async <T,>(action: () => Promise<T>, actionName?: string): Promise<T | null> => {
    if (isReadOnly) {
      toast.error('Periodo de prueba expirado', {
        description: 'Activa tu plan para continuar creando y editando contenido.',
        action: {
          label: 'Activar plan',
          onClick: () => window.location.href = '/settings',
        },
      });
      return null;
    }
    return action();
  }, [isReadOnly]);

  /**
   * Check if action is allowed (without showing toast)
   */
  const isActionAllowed = useCallback(() => {
    return !isReadOnly;
  }, [isReadOnly]);

  return {
    guardAction,
    guardAsyncAction,
    isActionAllowed,
    isReadOnly,
    isExpired,
    billingEnabled,
    daysRemaining,
  };
}
