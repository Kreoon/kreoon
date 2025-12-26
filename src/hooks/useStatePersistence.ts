import { useState, useEffect, useCallback, useRef } from 'react';

interface PersistenceOptions<T> {
  key: string;
  defaultValue: T;
  debounceMs?: number;
  expiryMs?: number;
}

interface PersistedData<T> {
  value: T;
  timestamp: number;
  version: number;
}

const STORAGE_VERSION = 1;

export function useStatePersistence<T>({
  key,
  defaultValue,
  debounceMs = 500,
  expiryMs = 24 * 60 * 60 * 1000, // 24 hours default
}: PersistenceOptions<T>) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`persist_${key}`);
      if (stored) {
        const parsed: PersistedData<T> = JSON.parse(stored);
        // Check if data is still valid
        if (
          parsed.version === STORAGE_VERSION &&
          Date.now() - parsed.timestamp < expiryMs
        ) {
          return parsed.value;
        }
        // Clean up expired data
        localStorage.removeItem(`persist_${key}`);
      }
    } catch (error) {
      console.error(`Error loading persisted state for ${key}:`, error);
    }
    return defaultValue;
  });

  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Persist to localStorage with debounce
  const persist = useCallback((newValue: T) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      try {
        const data: PersistedData<T> = {
          value: newValue,
          timestamp: Date.now(),
          version: STORAGE_VERSION,
        };
        localStorage.setItem(`persist_${key}`, JSON.stringify(data));
        setLastSaved(new Date());
        setIsDirty(false);
      } catch (error) {
        console.error(`Error persisting state for ${key}:`, error);
      }
    }, debounceMs);
  }, [key, debounceMs]);

  // Update value and mark as dirty
  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prev) 
        : newValue;
      setIsDirty(true);
      persist(next);
      return next;
    });
  }, [persist]);

  // Force save immediately
  const forceSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    try {
      const data: PersistedData<T> = {
        value,
        timestamp: Date.now(),
        version: STORAGE_VERSION,
      };
      localStorage.setItem(`persist_${key}`, JSON.stringify(data));
      setLastSaved(new Date());
      setIsDirty(false);
    } catch (error) {
      console.error(`Error force saving state for ${key}:`, error);
    }
  }, [key, value]);

  // Clear persisted data
  const clear = useCallback(() => {
    localStorage.removeItem(`persist_${key}`);
    setValue(defaultValue);
    setIsDirty(false);
    setLastSaved(null);
  }, [key, defaultValue]);

  // Save on visibility hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isDirty) {
        forceSave();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [isDirty, forceSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    value,
    setValue: updateValue,
    isDirty,
    lastSaved,
    forceSave,
    clear,
  };
}

// Simpler hook for just persisting a value without the dirty tracking
export function usePersistedValue<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const { value, setValue } = useStatePersistence({ key, defaultValue });
  return [value, setValue];
}
