import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  intervalMs?: number;
  debounceMs?: number;
  enabled?: boolean;
  compareData?: (prev: T, current: T) => boolean;
}

interface AutoSaveState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  error: Error | null;
}

export function useAutoSave<T>({
  data,
  onSave,
  intervalMs = 30000, // 30 seconds default
  debounceMs = 2000, // 2 seconds debounce
  enabled = true,
  compareData = (prev, current) => JSON.stringify(prev) !== JSON.stringify(current),
}: AutoSaveOptions<T>) {
  const [state, setState] = useState<AutoSaveState>({
    status: 'idle',
    lastSaved: null,
    error: null,
  });

  const { toast } = useToast();
  const lastDataRef = useRef<T>(data);
  const lastSavedDataRef = useRef<T>(data);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Save function
  const save = useCallback(async (dataToSave: T, silent = false) => {
    if (!isMountedRef.current) return;
    
    // Skip if no changes
    if (!compareData(lastSavedDataRef.current, dataToSave)) {
      return;
    }

    setState(prev => ({ ...prev, status: 'saving', error: null }));

    try {
      await onSave(dataToSave);
      
      if (!isMountedRef.current) return;
      
      lastSavedDataRef.current = dataToSave;
      setState({
        status: 'saved',
        lastSaved: new Date(),
        error: null,
      });

      // Reset to idle after 2 seconds
      setTimeout(() => {
        if (isMountedRef.current) {
          setState(prev => prev.status === 'saved' ? { ...prev, status: 'idle' } : prev);
        }
      }, 2000);
    } catch (error) {
      if (!isMountedRef.current) return;
      
      const err = error instanceof Error ? error : new Error('Save failed');
      setState({
        status: 'error',
        lastSaved: state.lastSaved,
        error: err,
      });

      if (!silent) {
        toast({
          title: 'Error al guardar',
          description: 'No se pudieron guardar los cambios automáticamente',
          variant: 'destructive',
        });
      }
    }
  }, [onSave, compareData, toast, state.lastSaved]);

  // Manual save
  const forceSave = useCallback(() => {
    return save(lastDataRef.current, false);
  }, [save]);

  // Debounced save on data change
  useEffect(() => {
    if (!enabled) return;

    lastDataRef.current = data;

    // Clear existing debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce save
    debounceTimeoutRef.current = setTimeout(() => {
      save(data, true);
    }, debounceMs);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [data, enabled, debounceMs, save]);

  // Interval-based save
  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    intervalRef.current = setInterval(() => {
      save(lastDataRef.current, true);
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, intervalMs, save]);

  // Save on visibility change (going to background)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && enabled) {
        // Cancel debounce and save immediately
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        save(lastDataRef.current, true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, save]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    forceSave,
    hasChanges: compareData(lastSavedDataRef.current, data),
  };
}
