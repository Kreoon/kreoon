import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';

// Types
export interface SavedView {
  id: string;
  name: string;
  type: 'kanban' | 'list' | 'calendar' | 'table';
  config: {
    visibleColumns: string[];
    columnOrder: string[];
    columnWidths: Record<string, number>;
    sortBy: { field: string; direction: 'asc' | 'desc' };
    filters?: Record<string, unknown>;
    cardSize?: 'compact' | 'normal' | 'large';
  };
  isPreset: boolean;
  createdAt: string;
}

export interface BoardPreferences {
  preferredView: 'kanban' | 'list' | 'calendar' | 'table';
  cardSize: 'compact' | 'normal' | 'large';
  compactMode: boolean;
  defaultSort: { field: string; direction: 'asc' | 'desc' };
}

export interface TableConfig {
  visibleColumns: string[];
  columnOrder: string[];
  columnWidths: Record<string, number>;
}

export interface UserBoardPreferencesState {
  preferences: BoardPreferences;
  savedViews: SavedView[];
  activeViewId: string | null;
  tableConfig: TableConfig;
  updatedAt: string | null;
}

// Presets predefinidos
export const BOARD_PRESETS: SavedView[] = [
  {
    id: 'preset-quick',
    name: 'Vista Rápida',
    type: 'kanban',
    config: {
      visibleColumns: ['title', 'status', 'deadline'],
      columnOrder: ['title', 'status', 'deadline'],
      columnWidths: {},
      sortBy: { field: 'deadline', direction: 'asc' },
      cardSize: 'compact',
    },
    isPreset: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'preset-detailed',
    name: 'Vista Detallada',
    type: 'kanban',
    config: {
      visibleColumns: ['title', 'status', 'deadline', 'creator', 'editor', 'client', 'tags', 'progress', 'video'],
      columnOrder: ['title', 'status', 'deadline', 'creator', 'editor', 'client', 'tags', 'progress', 'video'],
      columnWidths: {},
      sortBy: { field: 'created_at', direction: 'desc' },
      cardSize: 'large',
    },
    isPreset: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'preset-marketing',
    name: 'Vista Marketing',
    type: 'table',
    config: {
      visibleColumns: ['title', 'status', 'sphere_phase', 'campaign_week', 'marketing_approved_at', 'deadline'],
      columnOrder: ['title', 'status', 'sphere_phase', 'campaign_week', 'marketing_approved_at', 'deadline'],
      columnWidths: {},
      sortBy: { field: 'campaign_week', direction: 'asc' },
    },
    isPreset: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

// Default state
const DEFAULT_STATE: UserBoardPreferencesState = {
  preferences: {
    preferredView: 'kanban',
    cardSize: 'normal',
    compactMode: false,
    defaultSort: { field: 'created_at', direction: 'desc' },
  },
  savedViews: BOARD_PRESETS,
  activeViewId: null,
  tableConfig: {
    visibleColumns: ['title', 'status', 'client', 'responsible', 'deadline'],
    columnOrder: ['title', 'status', 'client', 'responsible', 'deadline'],
    columnWidths: {},
  },
  updatedAt: null,
};

// localStorage key generator
const getLocalStorageKey = (userId: string, orgId: string) =>
  `board_user_prefs_${userId}_${orgId}`;

export function useBoardUserPreferences(organizationId: string | null) {
  const { user } = useAuth();
  const [state, setState] = useState<UserBoardPreferencesState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const lastSyncRef = useRef<string | null>(null);
  const pendingChangesRef = useRef<Partial<UserBoardPreferencesState> | null>(null);

  // Debounced sync to Supabase (2 seconds)
  const debouncedState = useDebounce(state, 2000);

  // Load from localStorage immediately, then fetch from Supabase
  useEffect(() => {
    if (!user?.id || !organizationId) {
      setIsLoading(false);
      return;
    }

    const loadPreferences = async () => {
      setIsLoading(true);
      const localKey = getLocalStorageKey(user.id, organizationId);

      // 1. Load from localStorage first (instant)
      try {
        const localData = localStorage.getItem(localKey);
        if (localData) {
          const parsed = JSON.parse(localData) as UserBoardPreferencesState;
          // Merge presets with saved views
          const mergedViews = [
            ...BOARD_PRESETS,
            ...parsed.savedViews.filter(v => !v.isPreset),
          ];
          setState({ ...parsed, savedViews: mergedViews });
        }
      } catch (e) {
        console.warn('Error loading board preferences from localStorage:', e);
      }

      // 2. Fetch from Supabase in background
      try {
        const { data, error } = await supabase.rpc('get_board_preferences', {
          p_organization_id: organizationId,
        });

        if (error) throw error;

        if (data && data.updated_at) {
          const serverState: UserBoardPreferencesState = {
            preferences: data.preferences || DEFAULT_STATE.preferences,
            savedViews: [
              ...BOARD_PRESETS,
              ...(data.saved_views || []).filter((v: SavedView) => !v.isPreset),
            ],
            activeViewId: data.active_view_id,
            tableConfig: data.table_config || DEFAULT_STATE.tableConfig,
            updatedAt: data.updated_at,
          };

          // Compare timestamps - use server if newer
          const localData = localStorage.getItem(localKey);
          if (localData) {
            const parsed = JSON.parse(localData) as UserBoardPreferencesState;
            if (!parsed.updatedAt || new Date(data.updated_at) > new Date(parsed.updatedAt)) {
              setState(serverState);
              localStorage.setItem(localKey, JSON.stringify(serverState));
            }
          } else {
            setState(serverState);
            localStorage.setItem(localKey, JSON.stringify(serverState));
          }

          lastSyncRef.current = data.updated_at;
        }
      } catch (e) {
        console.warn('Error fetching board preferences from Supabase:', e);
      }

      setIsLoading(false);
    };

    loadPreferences();
  }, [user?.id, organizationId]);

  // Sync to Supabase when state changes (debounced)
  useEffect(() => {
    if (!user?.id || !organizationId || isLoading) return;

    // Skip if this is the initial load or no changes
    if (debouncedState.updatedAt === lastSyncRef.current) return;

    const syncToSupabase = async () => {
      setIsSyncing(true);
      try {
        await supabase.rpc('upsert_board_preferences', {
          p_organization_id: organizationId,
          p_preferences: debouncedState.preferences,
          p_saved_views: debouncedState.savedViews.filter(v => !v.isPreset),
          p_active_view_id: debouncedState.activeViewId,
          p_table_config: debouncedState.tableConfig,
        });
        lastSyncRef.current = new Date().toISOString();
      } catch (e) {
        console.error('Error syncing board preferences to Supabase:', e);
      }
      setIsSyncing(false);
    };

    syncToSupabase();
  }, [debouncedState, user?.id, organizationId, isLoading]);

  // Save to localStorage on every change (instant)
  useEffect(() => {
    if (!user?.id || !organizationId || isLoading) return;

    const localKey = getLocalStorageKey(user.id, organizationId);
    const dataToSave = { ...state, updatedAt: new Date().toISOString() };
    localStorage.setItem(localKey, JSON.stringify(dataToSave));
  }, [state, user?.id, organizationId, isLoading]);

  // Update functions
  const updatePreferences = useCallback((updates: Partial<BoardPreferences>) => {
    setState(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...updates },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateTableConfig = useCallback((updates: Partial<TableConfig>) => {
    setState(prev => ({
      ...prev,
      tableConfig: { ...prev.tableConfig, ...updates },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const setActiveView = useCallback((viewId: string | null) => {
    setState(prev => ({
      ...prev,
      activeViewId: viewId,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const saveView = useCallback((view: Omit<SavedView, 'id' | 'createdAt' | 'isPreset'>) => {
    const newView: SavedView = {
      ...view,
      id: `view-${Date.now()}`,
      isPreset: false,
      createdAt: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      savedViews: [...prev.savedViews, newView],
      updatedAt: new Date().toISOString(),
    }));

    return newView.id;
  }, []);

  const updateView = useCallback((viewId: string, updates: Partial<SavedView['config']>) => {
    setState(prev => ({
      ...prev,
      savedViews: prev.savedViews.map(v =>
        v.id === viewId && !v.isPreset
          ? { ...v, config: { ...v.config, ...updates } }
          : v
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const deleteView = useCallback((viewId: string) => {
    setState(prev => ({
      ...prev,
      savedViews: prev.savedViews.filter(v => v.id !== viewId || v.isPreset),
      activeViewId: prev.activeViewId === viewId ? null : prev.activeViewId,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const renameView = useCallback((viewId: string, newName: string) => {
    setState(prev => ({
      ...prev,
      savedViews: prev.savedViews.map(v =>
        v.id === viewId && !v.isPreset ? { ...v, name: newName } : v
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Get active view config
  const activeView = state.savedViews.find(v => v.id === state.activeViewId) || null;

  return {
    // State
    preferences: state.preferences,
    savedViews: state.savedViews,
    activeViewId: state.activeViewId,
    activeView,
    tableConfig: state.tableConfig,

    // Status
    isLoading,
    isSyncing,

    // Actions
    updatePreferences,
    updateTableConfig,
    setActiveView,
    saveView,
    updateView,
    deleteView,
    renameView,

    // Presets reference
    presets: BOARD_PRESETS,
  };
}
