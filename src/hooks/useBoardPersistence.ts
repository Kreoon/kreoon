import { useState, useEffect, useCallback, useRef } from 'react';
import { BoardView } from '@/components/board';

interface BoardFilters {
  creatorId: string;
  editorId: string;
  clientId: string;
  productId: string;
  campaignWeek: string;
  searchTerm: string;
  startDate?: string;
  deadline?: string;
}

interface BoardState {
  currentView: BoardView;
  filters: BoardFilters;
  selectedContentId: string | null;
  scrollPositions: Record<string, number>;
}

interface UseBoardPersistenceOptions {
  organizationId: string | null;
  debounceMs?: number;
}

const STORAGE_KEY_PREFIX = 'board_state_';
const STORAGE_VERSION = 1;

interface PersistedState {
  state: BoardState;
  version: number;
  timestamp: number;
}

const defaultFilters: BoardFilters = {
  creatorId: 'all',
  editorId: 'all',
  clientId: 'all',
  productId: 'all',
  campaignWeek: '',
  searchTerm: '',
  startDate: undefined,
  deadline: undefined,
};

const defaultState: BoardState = {
  currentView: 'kanban',
  filters: defaultFilters,
  selectedContentId: null,
  scrollPositions: {},
};

export function useBoardPersistence({ organizationId, debounceMs = 500 }: UseBoardPersistenceOptions) {
  const storageKey = `${STORAGE_KEY_PREFIX}${organizationId || 'default'}`;
  
  // Initialize state from localStorage
  const [state, setState] = useState<BoardState>(() => {
    if (typeof window === 'undefined') return defaultState;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: PersistedState = JSON.parse(stored);
        if (parsed.version === STORAGE_VERSION) {
          return parsed.state;
        }
      }
    } catch (error) {
      console.error('Error loading board state:', error);
    }
    return defaultState;
  });

  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef(state);
  
  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Persist to localStorage with debounce
  const persist = useCallback((newState: BoardState) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      try {
        const data: PersistedState = {
          state: newState,
          version: STORAGE_VERSION,
          timestamp: Date.now(),
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
        setLastSaved(new Date());
        setIsDirty(false);
      } catch (error) {
        console.error('Error persisting board state:', error);
      }
    }, debounceMs);
  }, [storageKey, debounceMs]);

  // Update view
  const setCurrentView = useCallback((view: BoardView) => {
    setState(prev => {
      const newState = { ...prev, currentView: view };
      setIsDirty(true);
      persist(newState);
      return newState;
    });
  }, [persist]);

  // Update filters
  const setFilters = useCallback((updates: Partial<BoardFilters>) => {
    setState(prev => {
      const newState = { 
        ...prev, 
        filters: { ...prev.filters, ...updates } 
      };
      setIsDirty(true);
      persist(newState);
      return newState;
    });
  }, [persist]);

  // Update selected content
  const setSelectedContentId = useCallback((id: string | null) => {
    setState(prev => {
      const newState = { ...prev, selectedContentId: id };
      setIsDirty(true);
      persist(newState);
      return newState;
    });
  }, [persist]);

  // Update scroll position for a specific column
  const setScrollPosition = useCallback((columnId: string, position: number) => {
    setState(prev => {
      const newState = {
        ...prev,
        scrollPositions: { ...prev.scrollPositions, [columnId]: position }
      };
      // Don't mark as dirty for scroll - just persist silently
      persist(newState);
      return newState;
    });
  }, [persist]);

  // Force save immediately
  const forceSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    try {
      const data: PersistedState = {
        state: stateRef.current,
        version: STORAGE_VERSION,
        timestamp: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
      setLastSaved(new Date());
      setIsDirty(false);
    } catch (error) {
      console.error('Error force saving board state:', error);
    }
  }, [storageKey]);

  // Clear all persisted data
  const clearState = useCallback(() => {
    localStorage.removeItem(storageKey);
    setState(defaultState);
    setIsDirty(false);
    setLastSaved(null);
  }, [storageKey]);

  // Reset filters only
  const resetFilters = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, filters: defaultFilters };
      setIsDirty(true);
      persist(newState);
      return newState;
    });
  }, [persist]);

  // Save on visibility hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isDirty) {
        forceSave();
      }
    };

    const handleBeforeUnload = () => {
      if (isDirty) {
        forceSave();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [isDirty, forceSave]);

  // Reload when organization changes
  useEffect(() => {
    if (!organizationId) return;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: PersistedState = JSON.parse(stored);
        if (parsed.version === STORAGE_VERSION) {
          setState(parsed.state);
          setLastSaved(new Date(parsed.timestamp));
        }
      } else {
        setState(defaultState);
      }
    } catch (error) {
      console.error('Error reloading board state:', error);
    }
  }, [organizationId, storageKey]);

  return {
    // State
    currentView: state.currentView,
    filters: state.filters,
    selectedContentId: state.selectedContentId,
    scrollPositions: state.scrollPositions,
    
    // Setters
    setCurrentView,
    setFilters,
    setSelectedContentId,
    setScrollPosition,
    
    // Utils
    isDirty,
    lastSaved,
    forceSave,
    clearState,
    resetFilters,
  };
}
