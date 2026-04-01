import { useReducer, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { BuilderToolbar } from './BuilderToolbar';
import { BuilderSidebar } from './BuilderSidebar';
import { BlockSettingsPanel } from './BlockSettingsPanel';
import { ResponsivePreview } from './ResponsivePreview';
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

// ─── Placeholder Canvas ───────────────────────────────────────────────────────
// Este componente puede reemplazarse por el canvas real con bloques renderizados

function CanvasPlaceholder({
  blocks,
  selectedBlockId,
  onSelectBlock,
}: {
  blocks: ProfileBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
}) {
  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg text-center p-8">
        <p className="text-sm font-medium text-muted-foreground">
          Tu perfil está vacío
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Arrastra bloques desde el panel izquierdo para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {blocks.map((block) => (
        <div
          key={block.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelectBlock(block.id)}
          onKeyDown={(e) => e.key === 'Enter' && onSelectBlock(block.id)}
          aria-label={`Seleccionar bloque ${block.type}`}
          aria-pressed={selectedBlockId === block.id}
          className={cn(
            'p-4 rounded-sm border transition-all cursor-pointer',
            selectedBlockId === block.id
              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
              : 'border-border bg-card hover:border-primary/40',
            !block.isVisible && 'opacity-50'
          )}
        >
          <p className="text-xs font-medium">{block.type}</p>
          <p className="text-[10px] text-muted-foreground">orderIndex: {block.orderIndex}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ProfileBuilder({ profileId }: ProfileBuilderProps) {
  const [state, dispatch] = useReducer(builderReducer, INITIAL_STATE);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDragStart = useCallback((_event: DragStartEvent) => {
    // Podría usarse para mostrar overlay de drag
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const isFromPalette = active.data.current?.fromPalette === true;

      if (isFromPalette) {
        // Añadir nuevo bloque al canvas
        const blockType = active.data.current?.type as BlockType;
        const newBlock = createBlock(blockType, state.blocks.length);
        dispatch({ type: 'ADD_BLOCK', payload: { block: newBlock } });
        dispatch({ type: 'SELECT_BLOCK', payload: newBlock.id });
      } else {
        // Reordenar bloques existentes
        if (active.id !== over.id) {
          dispatch({
            type: 'REORDER_BLOCKS',
            payload: { activeId: String(active.id), overId: String(over.id) },
          });
        }
      }
    },
    [state.blocks.length]
  );

  const handleSaveDraft = useCallback(async () => {
    dispatch({ type: 'SET_SAVING', payload: true });
    // TODO: integrar con hook de Supabase cuando esté disponible
    await new Promise((r) => setTimeout(r, 800));
    dispatch({ type: 'SET_SAVING', payload: false });
    dispatch({ type: 'SET_DIRTY', payload: false });
  }, []);

  const handlePublish = useCallback(async () => {
    dispatch({ type: 'SET_SAVING', payload: true });
    // TODO: integrar lógica de publicación
    await new Promise((r) => setTimeout(r, 800));
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

  const handleConfigChange = useCallback((updates: Partial<BuilderConfig>) => {
    dispatch({ type: 'SET_BUILDER_CONFIG', payload: updates });
  }, []);

  const selectedBlock = state.blocks.find((b) => b.id === state.selectedBlockId) ?? null;

  // ── Layout mobile vs desktop ───────────────────────────────────────────────

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

        {/* Body: 3 columnas en desktop, 1 columna en mobile */}
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
          <main className="flex-1 overflow-hidden bg-muted/30 flex flex-col">
            {/* Botones mobile: acceso a sidebar y settings */}
            <div className="flex md:hidden items-center gap-2 px-3 py-2 border-b border-border bg-background">
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

            {/* Área de preview con scroll */}
            <ScrollArea className="flex-1">
              <div className="p-6 min-h-full">
                <ResponsivePreview device={state.previewDevice}>
                  <SortableContext
                    items={state.blocks.map((b) => b.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <CanvasPlaceholder
                      blocks={state.blocks}
                      selectedBlockId={state.selectedBlockId}
                      onSelectBlock={(id) =>
                        dispatch({ type: 'SELECT_BLOCK', payload: id })
                      }
                    />
                  </SortableContext>
                </ResponsivePreview>
              </div>
            </ScrollArea>
          </main>

          {/* Panel derecho de settings — solo desktop */}
          <aside
            className={cn(
              'hidden md:flex flex-col w-72 border-l border-border bg-background overflow-hidden transition-all duration-200',
              !selectedBlock && 'w-0 border-0'
            )}
            aria-label="Panel de configuración del bloque"
          >
            {selectedBlock ? (
              <div className="flex flex-col h-full">
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
                  <BlockSettingsPanel
                    block={selectedBlock}
                    onUpdate={(updates) => handleUpdateBlock(selectedBlock.id, updates)}
                  />
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>

      {/* DragOverlay: feedback visual durante el arrastre */}
      <DragOverlay>
        {/* Overlay genérico — se puede mejorar con el bloque arrastrado */}
        <div className="p-3 rounded-sm border border-primary bg-primary/10 shadow-lg text-xs font-medium text-primary">
          Soltando aquí...
        </div>
      </DragOverlay>
    </DndContext>
  );
}
