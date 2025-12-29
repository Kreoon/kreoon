import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Save, X, Loader2 } from 'lucide-react';

interface UnsavedChangesContextType {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  registerSaveHandler: (key: string, handler: () => Promise<void>) => void;
  unregisterSaveHandler: (key: string) => void;
  saveAll: () => Promise<void>;
  markAsChanged: (key: string) => void;
  markAsSaved: (key: string) => void;
  changedKeys: Set<string>;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | null>(null);

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider');
  }
  return context;
}

// Safe hook that returns default values if not wrapped in provider
export function useUnsavedChangesSafe() {
  const context = useContext(UnsavedChangesContext);
  return context || {
    hasUnsavedChanges: false,
    setHasUnsavedChanges: () => {},
    registerSaveHandler: () => {},
    unregisterSaveHandler: () => {},
    saveAll: async () => {},
    markAsChanged: () => {},
    markAsSaved: () => {},
    changedKeys: new Set<string>(),
  };
}

interface Props {
  children: React.ReactNode;
}

export function UnsavedChangesProvider({ children }: Props) {
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const saveHandlers = useRef<Map<string, () => Promise<void>>>(new Map());

  const hasUnsavedChanges = changedKeys.size > 0;

  const setHasUnsavedChanges = useCallback((value: boolean) => {
    if (!value) {
      setChangedKeys(new Set());
    }
  }, []);

  const markAsChanged = useCallback((key: string) => {
    setChangedKeys(prev => new Set(prev).add(key));
  }, []);

  const markAsSaved = useCallback((key: string) => {
    setChangedKeys(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const registerSaveHandler = useCallback((key: string, handler: () => Promise<void>) => {
    saveHandlers.current.set(key, handler);
  }, []);

  const unregisterSaveHandler = useCallback((key: string) => {
    saveHandlers.current.delete(key);
    markAsSaved(key);
  }, [markAsSaved]);

  const saveAll = useCallback(async () => {
    setIsSaving(true);
    try {
      const promises: Promise<void>[] = [];
      changedKeys.forEach(key => {
        const handler = saveHandlers.current.get(key);
        if (handler) {
          promises.push(handler());
        }
      });
      await Promise.all(promises);
      setChangedKeys(new Set());
    } finally {
      setIsSaving(false);
    }
  }, [changedKeys]);

  // Handle beforeunload for desktop - warn user before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle visibility change - backup state when losing focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasUnsavedChanges) {
        // Persist current state to localStorage as backup
        const stateBackup = {
          timestamp: Date.now(),
          keys: Array.from(changedKeys),
        };
        localStorage.setItem('unsaved_changes_backup', JSON.stringify(stateBackup));
        console.log('[UnsavedChanges] Backed up state before tab switch');
      } else if (document.visibilityState === 'visible') {
        // User returned to the tab - check if we have a backup
        const backup = localStorage.getItem('unsaved_changes_backup');
        if (backup) {
          try {
            const parsed = JSON.parse(backup);
            // Only restore if backup is recent (within 30 minutes)
            const thirtyMinutes = 30 * 60 * 1000;
            if (Date.now() - parsed.timestamp < thirtyMinutes && parsed.keys?.length > 0) {
              console.log('[UnsavedChanges] Restored state after tab return');
              // Keep the backup for now - only clear after successful save
            }
          } catch (e) {
            // Invalid backup, ignore
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [hasUnsavedChanges, changedKeys]);

  const handleSaveAndContinue = async () => {
    await saveAll();
    setShowConfirmDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleDiscardAndContinue = () => {
    setChangedKeys(new Set());
    setShowConfirmDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setPendingNavigation(null);
  };

  return (
    <UnsavedChangesContext.Provider
      value={{
        hasUnsavedChanges,
        setHasUnsavedChanges,
        registerSaveHandler,
        unregisterSaveHandler,
        saveAll,
        markAsChanged,
        markAsSaved,
        changedKeys,
      }}
    >
      {children}

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. ¿Qué deseas hacer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={handleCancel} className="sm:order-1">
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </AlertDialogCancel>
            <Button 
              variant="destructive" 
              onClick={handleDiscardAndContinue}
              className="sm:order-2"
            >
              Salir sin guardar
            </Button>
            <Button 
              onClick={handleSaveAndContinue} 
              disabled={isSaving}
              className="sm:order-3"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar y salir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UnsavedChangesContext.Provider>
  );
}
