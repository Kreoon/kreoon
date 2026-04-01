import { useReducer, useCallback } from 'react';
import {
  BuilderState,
  BuilderAction,
  ProfileBlock,
  BuilderConfig,
  DEFAULT_BUILDER_CONFIG,
} from '../types/profile-builder';

// ─── Estado inicial ────────────────────────────────────────────────────────────

const INITIAL_STATE: BuilderState = {
  blocks: [],
  selectedBlockId: null,
  isDirty: false,
  isLoading: false,
  isSaving: false,
  previewDevice: 'desktop',
  builderConfig: DEFAULT_BUILDER_CONFIG,
};

// ─── Reducer ───────────────────────────────────────────────────────────────────

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'SET_BLOCKS': {
      const sorted = [...action.payload].sort((a, b) => a.orderIndex - b.orderIndex);
      return { ...state, blocks: sorted };
    }

    case 'ADD_BLOCK': {
      const { block, atIndex } = action.payload;
      let newBlocks: ProfileBlock[];

      if (atIndex !== undefined) {
        // Insertar en posición específica y re-indexar
        newBlocks = [
          ...state.blocks.slice(0, atIndex),
          { ...block, orderIndex: atIndex },
          ...state.blocks.slice(atIndex),
        ].map((b, i) => ({ ...b, orderIndex: i }));
      } else {
        // Agregar al final
        const maxIndex = state.blocks.length;
        newBlocks = [...state.blocks, { ...block, orderIndex: maxIndex }];
      }

      return { ...state, blocks: newBlocks, isDirty: true };
    }

    case 'REMOVE_BLOCK': {
      const filtered = state.blocks
        .filter((b) => b.id !== action.payload)
        .map((b, i) => ({ ...b, orderIndex: i }));

      const nextSelectedId =
        state.selectedBlockId === action.payload ? null : state.selectedBlockId;

      return {
        ...state,
        blocks: filtered,
        selectedBlockId: nextSelectedId,
        isDirty: true,
      };
    }

    case 'UPDATE_BLOCK': {
      const { id, updates } = action.payload;
      const updatedBlocks = state.blocks.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      );
      return { ...state, blocks: updatedBlocks, isDirty: true };
    }

    case 'REORDER_BLOCKS': {
      const { activeId, overId } = action.payload;
      const activeIndex = state.blocks.findIndex((b) => b.id === activeId);
      const overIndex = state.blocks.findIndex((b) => b.id === overId);

      if (activeIndex === -1 || overIndex === -1) return state;

      const reordered = [...state.blocks];
      const [moved] = reordered.splice(activeIndex, 1);
      reordered.splice(overIndex, 0, moved);

      const withUpdatedIndexes = reordered.map((b, i) => ({
        ...b,
        orderIndex: i,
      }));

      return { ...state, blocks: withUpdatedIndexes, isDirty: true };
    }

    case 'SELECT_BLOCK': {
      return { ...state, selectedBlockId: action.payload };
    }

    case 'SET_PREVIEW_DEVICE': {
      return { ...state, previewDevice: action.payload };
    }

    case 'SET_BUILDER_CONFIG': {
      return {
        ...state,
        builderConfig: { ...state.builderConfig, ...action.payload },
        isDirty: true,
      };
    }

    case 'SET_DIRTY': {
      return { ...state, isDirty: action.payload };
    }

    case 'SET_LOADING': {
      return { ...state, isLoading: action.payload };
    }

    case 'SET_SAVING': {
      return { ...state, isSaving: action.payload };
    }

    case 'TOGGLE_BLOCK_VISIBILITY': {
      const toggled = state.blocks.map((b) =>
        b.id === action.payload ? { ...b, isVisible: !b.isVisible } : b
      );
      return { ...state, blocks: toggled, isDirty: true };
    }

    default:
      return state;
  }
}

// ─── Interfaz pública del hook ─────────────────────────────────────────────────

export interface UseProfileBuilderReturn {
  state: BuilderState;
  dispatch: React.Dispatch<BuilderAction>;
  // Acciones con nombres semánticos para componentes
  addBlock: (block: ProfileBlock, atIndex?: number) => void;
  removeBlock: (id: string) => void;
  updateBlock: (id: string, updates: Partial<ProfileBlock>) => void;
  reorderBlocks: (activeId: string, overId: string) => void;
  selectBlock: (id: string | null) => void;
  toggleBlockVisibility: (id: string) => void;
  setPreviewDevice: (device: 'desktop' | 'tablet' | 'mobile') => void;
  setBuilderConfig: (config: Partial<BuilderConfig>) => void;
  setBlocks: (blocks: ProfileBlock[]) => void;
  markClean: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProfileBuilder(
  initialState: Partial<BuilderState> = {}
): UseProfileBuilderReturn {
  const [state, dispatch] = useReducer(builderReducer, {
    ...INITIAL_STATE,
    ...initialState,
  });

  const addBlock = useCallback(
    (block: ProfileBlock, atIndex?: number) => {
      dispatch({ type: 'ADD_BLOCK', payload: { block, atIndex } });
    },
    []
  );

  const removeBlock = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_BLOCK', payload: id });
  }, []);

  const updateBlock = useCallback(
    (id: string, updates: Partial<ProfileBlock>) => {
      dispatch({ type: 'UPDATE_BLOCK', payload: { id, updates } });
    },
    []
  );

  const reorderBlocks = useCallback((activeId: string, overId: string) => {
    dispatch({ type: 'REORDER_BLOCKS', payload: { activeId, overId } });
  }, []);

  const selectBlock = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_BLOCK', payload: id });
  }, []);

  const toggleBlockVisibility = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_BLOCK_VISIBILITY', payload: id });
  }, []);

  const setPreviewDevice = useCallback(
    (device: 'desktop' | 'tablet' | 'mobile') => {
      dispatch({ type: 'SET_PREVIEW_DEVICE', payload: device });
    },
    []
  );

  const setBuilderConfig = useCallback((config: Partial<BuilderConfig>) => {
    dispatch({ type: 'SET_BUILDER_CONFIG', payload: config });
  }, []);

  const setBlocks = useCallback((blocks: ProfileBlock[]) => {
    dispatch({ type: 'SET_BLOCKS', payload: blocks });
  }, []);

  const markClean = useCallback(() => {
    dispatch({ type: 'SET_DIRTY', payload: false });
  }, []);

  return {
    state,
    dispatch,
    addBlock,
    removeBlock,
    updateBlock,
    reorderBlocks,
    selectBlock,
    toggleBlockVisibility,
    setPreviewDevice,
    setBuilderConfig,
    setBlocks,
    markClean,
  };
}
