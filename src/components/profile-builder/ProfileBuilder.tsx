import { useReducer, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { BuilderToolbar } from './BuilderToolbar';
import { BuilderSidebar } from './BuilderSidebar';
import { BlockSettingsPanel } from './BlockSettingsPanel';
import { BuilderCanvas } from './BuilderCanvas';
import {
  DEFAULT_BUILDER_CONFIG,
  createBlock,
  type BuilderState,
  type BuilderAction,
  type ProfileBlock,
  type BuilderConfig,
  type BlockType,
} from './types/profile-builder';

// ─── Reducer ─────────────────────────────────────────────────────────────────

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'SET_BLOCKS':
      return { ...state, blocks: action.payload };

    case 'ADD_BLOCK': {
      const { block, atIndex } = action.payload;
      const newBlocks =
        atIndex !== undefined
          ? [
              ...state.blocks.slice(0, atIndex),
              block,
              ...state.blocks.slice(atIndex),
            ]
          : [...state.blocks, block];
      return {
        ...state,
        blocks: newBlocks.map((b, i) => ({ ...b, orderIndex: i })),
        isDirty: true,
      };
    }

    case 'REMOVE_BLOCK':
      return {
        ...state,
        blocks: state.blocks
          .filter((b) => b.id !== action.payload)
          .map((b, i) => ({ ...b, orderIndex: i })),
        selectedBlockId:
          state.selectedBlockId === action.payload ? null : state.selectedBlockId,
        isDirty: true,
      };

    case 'UPDATE_BLOCK':
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.payload.id ? { ...b, ...action.payload.updates } : b
        ),
        isDirty: true,
      };

    case 'REORDER_BLOCKS': {
      const { activeId, overId } = action.payload;
      const oldIndex = state.blocks.findIndex((b) => b.id === activeId);
      const newIndex = state.blocks.findIndex((b) => b.id === overId);
      if (oldIndex === -1 || newIndex === -1) return state;
      const reordered = arrayMove(state.blocks, oldIndex, newIndex).map((b, i) => ({
        ...b,
        orderIndex: i,
      }));
      return { ...state, blocks: reordered, isDirty: true };
    }

    case 'SELECT_BLOCK':
      return { ...state, selectedBlockId: action.payload };

    case 'SET_PREVIEW_DEVICE':
      return { ...state, previewDevice: action.payload };

    case 'SET_BUILDER_CONFIG':
      return {
        ...state,
        builderConfig: { ...state.builderConfig, ...action.payload },
        isDirty: true,
      };

    case 'SET_DIRTY':
      return { ...state, isDirty: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };

    case 'TOGGLE_BLOCK_VISIBILITY':
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.payload ? { ...b, isVisible: !b.isVisible } : b
        ),
        isDirty: true,
      };

    default:
      return state;
  }
}

const INITIAL_STATE: BuilderState = {
  blocks: [],
  selectedBlockId: null,
  isDirty: false,
  isLoading: false,
  isSaving: false,
  previewDevice: 'desktop',
  builderConfig: DEFAULT_BUILDER_CONFIG,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileBuilderProps {
  profileId: string;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ProfileBuilder({ profileId }: ProfileBuilderProps) {
  const [state, dispatch] = useReducer(builderReducer, INITIAL_STATE);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const isFromPalette = active.data.current?.fromPalette === true;

      if (isFromPalette) {
        // Añadir nuevo bloque al canvas desde la paleta
        const blockType = active.data.current?.type as BlockType;
        const newBlock = createBlock(blockType, state.blocks.length);
        dispatch({ type: 'ADD_BLOCK', payload: { block: newBlock } });
        dispatch({ type: 'SELECT_BLOCK', payload: newBlock.id });
      } else if (active.id !== over.id) {
        // Reordenar bloques existentes en el canvas
        dispatch({
          type: 'REORDER_BLOCKS',
          payload: { activeId: String(active.id), overId: String(over.id) },
        });
      }
    },
    [state.blocks.length]
  );

  const handleDragStart = useCallback((_event: DragStartEvent) => {
    // Reservado para feedback visual futuro
  }, []);

  const handleSaveDraft = useCallback(async () => {
    dispatch({ type: 'SET_SAVING', payload: true });
    // TODO: conectar con useProfileBuilder hook cuando esté disponible
    await new Promise<void>((r) => setTimeout(r, 800));
    dispatch({ type: 'SET_SAVING', payload: false });
    dispatch({ type: 'SET_DIRTY', payload: false });
  }, []);

  const handlePublish = useCallback(async () => {
    dispatch({ type: 'SET_SAVING', payload: true });
    // TODO: conectar lógica de publicación
    await new Promise<void>((r) => setTimeout(r, 800));
    dispatch({ type: 'SET_SAVING', payload: false });
    dispatch({ type: 'SET_DIRTY', payload: false });
  }, []);

  const handlePreview = useCallback(() => {
    window.open(`/p/${profileId}`, '_blank', 'noopener,noreferrer');
  }, [profileId]);

  const handleUpdateBlock = useCallback(
    (id: string, updates: Partial<ProfileBlock>) => {
      dispatch({ type: 'UPDATE_BLOCK', payload: { id, updates } });
    },
    []
  );

  const handleDeleteBlock = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_BLOCK', payload: id });
  }, []);

  const handleConfigChange = useCallback((updates: Partial<BuilderConfig>) => {
    dispatch({ type: 'SET_BUILDER_CONFIG', payload: updates });
  }, []);

  const selectedBlock = state.blocks.find((b) => b.id === state.selectedBlockId) ?? null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        {/* Toolbar */}
        <BuilderToolbar
          isDirty={state.isDirty}
          isSaving={state.isSaving}
          previewDevice={state.previewDevice}
          profileId={profileId}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
          onPreview={handlePreview}
          onDeviceChange={(device) =>
            dispatch({ type: 'SET_PREVIEW_DEVICE', payload: device })
          }
        />

        {/* Body: sidebar | canvas | settings */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar izquierdo — oculto en mobile */}
          <div className="hidden md:flex">
            <BuilderSidebar
              blocks={state.blocks}
              builderConfig={state.builderConfig}
              onConfigChange={handleConfigChange}
            />
          </div>

          {/* Canvas central */}
          <main className="flex-1 overflow-hidden bg-muted/20 flex flex-col">
            {/* Controles mobile: acceso a sidebar y panel de bloque */}
            <div className="flex md:hidden items-center gap-2 px-3 py-2 border-b border-border bg-background flex-shrink-0">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    Bloques y Estilos
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <BuilderSidebar
                    blocks={state.blocks}
                    builderConfig={state.builderConfig}
                    onConfigChange={handleConfigChange}
                  />
                </SheetContent>
              </Sheet>

              {selectedBlock && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs gap-1.5">
                      <Settings2 className="h-3.5 w-3.5" />
                      Configurar bloque
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-72 p-0">
                    <BlockSettingsPanel
                      block={selectedBlock}
                      onUpdate={(updates) => handleUpdateBlock(selectedBlock.id, updates)}
                    />
                  </SheetContent>
                </Sheet>
              )}
            </div>

            {/* Canvas real con bloques */}
            <BuilderCanvas
              blocks={state.blocks}
              selectedBlockId={state.selectedBlockId}
              onSelectBlock={(id) => dispatch({ type: 'SELECT_BLOCK', payload: id })}
              onUpdateBlock={handleUpdateBlock}
              onReorderBlocks={(activeId, overId) =>
                dispatch({ type: 'REORDER_BLOCKS', payload: { activeId, overId } })
              }
              onDeleteBlock={handleDeleteBlock}
              previewDevice={state.previewDevice}
            />
          </main>

          {/* Panel derecho de settings — solo desktop, con animación */}
          <aside
            className={cn(
              'hidden md:flex flex-col border-l border-border bg-background overflow-hidden',
              'transition-[width] duration-200 ease-in-out',
              selectedBlock ? 'w-72' : 'w-0 border-0'
            )}
            aria-label="Panel de configuración del bloque seleccionado"
          >
            {selectedBlock && (
              <div className="flex flex-col h-full w-72">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
                  <span className="text-xs text-muted-foreground font-medium">
                    Configurar bloque
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => dispatch({ type: 'SELECT_BLOCK', payload: null })}
                    aria-label="Cerrar panel de configuración"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <BlockSettingsPanel
                      block={selectedBlock}
                      onUpdate={(updates) => handleUpdateBlock(selectedBlock.id, updates)}
                    />
                  </ScrollArea>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* DragOverlay: feedback visual al arrastrar desde la paleta */}
      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
        <div className="px-3 py-2 rounded-sm border border-primary bg-primary/10 shadow-lg text-xs font-medium text-primary pointer-events-none">
          Suelta para agregar
        </div>
      </DragOverlay>
    </DndContext>
  );
}
