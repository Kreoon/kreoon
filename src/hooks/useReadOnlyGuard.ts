import { useImpersonation } from '@/contexts/ImpersonationContext';
import { toast } from 'sonner';
import { useCallback } from 'react';

/**
 * Hook that provides a wrapper for actions that should be blocked in read-only mode.
 * Use this in components where write actions need to be prevented during impersonation.
 */
export function useReadOnlyGuard() {
  const { isReadOnlyMode, canPerformAction } = useImpersonation();

  /**
   * Wraps an action handler to block it in read-only mode.
   * Shows a toast notification when blocked.
   */
  const guardAction = useCallback(<T extends (...args: any[]) => any>(
    action: T,
    actionName: string = 'action'
  ): T => {
    return ((...args: Parameters<T>) => {
      if (isReadOnlyMode) {
        toast.warning('Modo solo lectura', {
          description: `No puedes ejecutar "${actionName}" mientras estás en modo simulación.`,
          duration: 3000,
        });
        return;
      }
      return action(...args);
    }) as T;
  }, [isReadOnlyMode]);

  /**
   * Check if an action should be blocked and show toast if so.
   * Returns true if the action should proceed, false if blocked.
   */
  const checkAction = useCallback((actionName: string): boolean => {
    if (!canPerformAction(actionName)) {
      toast.warning('Modo solo lectura', {
        description: `No puedes ejecutar "${actionName}" mientras estás en modo simulación.`,
        duration: 3000,
      });
      return false;
    }
    return true;
  }, [canPerformAction]);

  return {
    isReadOnlyMode,
    guardAction,
    checkAction,
  };
}
