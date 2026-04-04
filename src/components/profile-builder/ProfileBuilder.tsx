import { useReducer, useCallback, useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useCreatorPlanFeatures } from '@/hooks/useCreatorPlanFeatures';
import { useProfileBuilderData } from './hooks/useProfileBuilderData';
import { BuilderToolbar } from './BuilderToolbar';
import { BuilderSidebar } from './BuilderSidebar';
import { BlockSettingsPanel } from './BlockSettingsPanel';
import { BuilderCanvas } from './BuilderCanvas';
import { PlanStatusBar } from './PlanStatusBar';
import { TemplateSelector } from './templates/TemplateSelector';
import { UpgradeModal } from '@/components/premium/UpgradeModal';
import {
  DEFAULT_BUILDER_CONFIG,
  createBlock,
  type BuilderState,
  type BuilderAction,
  type ProfileBlock,
  type BuilderConfig,
  type BlockType,
  type ProfileTemplate,
} from './types/profile-builder';
import { generateBlocksFromTemplate, type CreatorDataForTemplate } from '@/lib/profile-builder/generateBlocksFromTemplate';

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

    case 'ADD_BLOCK_TO_CONTAINER': {
      const { parentId, block, columnIndex } = action.payload;
      const addBlockToParent = (blocks: ProfileBlock[]): ProfileBlock[] => {
        return blocks.map((b) => {
          if (b.id === parentId) {
            const children = b.children || [];
            const newChild = { ...block, parentId, columnIndex };
            return { ...b, children: [...children, newChild] };
          }
          if (b.children?.length) {
            return { ...b, children: addBlockToParent(b.children) };
          }
          return b;
        });
      };
      return { ...state, blocks: addBlockToParent(state.blocks), isDirty: true };
    }

    case 'REMOVE_FROM_CONTAINER': {
      const { parentId, blockId } = action.payload;
      const removeFromParent = (blocks: ProfileBlock[]): ProfileBlock[] => {
        return blocks.map((b) => {
          if (b.id === parentId) {
            return { ...b, children: b.children?.filter((c) => c.id !== blockId) || [] };
          }
          if (b.children?.length) {
            return { ...b, children: removeFromParent(b.children) };
          }
          return b;
        });
      };
      return { ...state, blocks: removeFromParent(state.blocks), isDirty: true };
    }

    case 'MOVE_BLOCK_TO_COLUMN': {
      const { parentId, blockId, newColumnIndex } = action.payload;
      const moveToColumn = (blocks: ProfileBlock[]): ProfileBlock[] => {
        return blocks.map((b) => {
          if (b.id === parentId) {
            return {
              ...b,
              children: b.children?.map((c) =>
                c.id === blockId ? { ...c, columnIndex: newColumnIndex } : c
              ) || [],
            };
          }
          if (b.children?.length) {
            return { ...b, children: moveToColumn(b.children) };
          }
          return b;
        });
      };
      return { ...state, blocks: moveToColumn(state.blocks), isDirty: true };
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const { tier, maxBlocks, canUseBlock } = useCreatorPlanFeatures();

  // Hook para operaciones de perfil (preview, guardar, publicar)
  const {
    profile,
    blocks: savedBlocks,
    currentTemplate: savedTemplate,
    marketplaceData,
    generatePreviewTokenAsync,
    saveBlocksAsync,
    saveBuilderConfigAsync,
    publishBlocks,
    isSaving: hookIsSaving,
    isPublishing,
    isLoading: dataLoading,
  } = useProfileBuilderData(profileId);

  // Cargar bloques desde la BD al iniciar (o generados automáticamente)
  const [hasLoadedBlocks, setHasLoadedBlocks] = useState(false);
  useEffect(() => {
    console.log('[ProfileBuilder] useEffect carga:', {
      hasLoadedBlocks,
      savedBlocksLength: savedBlocks.length,
      stateBlocksLength: state.blocks.length,
      savedTemplate,
    });
    if (!hasLoadedBlocks && savedBlocks.length > 0 && state.blocks.length === 0) {
      console.log('[ProfileBuilder] Cargando bloques desde BD:', savedBlocks.length);
      dispatch({ type: 'SET_BLOCKS', payload: savedBlocks });
      setCurrentTemplate(savedTemplate);
      setHasLoadedBlocks(true);
    }
  }, [savedBlocks, savedTemplate, hasLoadedBlocks, state.blocks.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Estrategia de detección personalizada que prioriza contenedores
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    // Primero buscar colisiones con contenedores (column, container, section)
    const pointerCollisions = pointerWithin(args);

    // Filtrar para priorizar contenedores
    const containerCollisions = pointerCollisions.filter(
      (collision) => collision.data?.droppableContainer?.data?.current?.type === 'column'
    );

    // Si hay colisión con un contenedor, usarlo
    if (containerCollisions.length > 0) {
      return containerCollisions;
    }

    // Si no, usar rectIntersection para el canvas general
    return rectIntersection(args);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const isFromPalette = active.data.current?.fromPalette === true;
      const overData = over.data.current;
      const isOverColumn = overData?.type === 'column';

      if (isFromPalette) {
        const blockType = active.data.current?.type as BlockType;

        // Validar limite de bloques (solo si hay limite)
        if (isFinite(maxBlocks) && state.blocks.length >= maxBlocks) {
          toast({
            title: 'Limite de bloques alcanzado',
            description: `Tu plan permite maximo ${maxBlocks} bloques. Upgrade para agregar mas.`,
            variant: 'destructive',
          });
          setShowUpgradeModal(true);
          return;
        }

        // Validar si puede usar este tipo de bloque
        if (!canUseBlock(blockType)) {
          toast({
            title: 'Bloque no disponible',
            description: 'Este bloque requiere un plan superior.',
            variant: 'destructive',
          });
          setShowUpgradeModal(true);
          return;
        }

        // Crear el nuevo bloque
        const newBlock = createBlock(blockType, state.blocks.length);

        // Si el drop es sobre una columna de un contenedor
        if (isOverColumn && overData?.parentId) {
          dispatch({
            type: 'ADD_BLOCK_TO_CONTAINER',
            payload: {
              parentId: overData.parentId as string,
              block: newBlock,
              columnIndex: overData.columnIndex as number,
            },
          });
        } else {
          // Añadir nuevo bloque al canvas desde la paleta
          dispatch({ type: 'ADD_BLOCK', payload: { block: newBlock } });
        }
        dispatch({ type: 'SELECT_BLOCK', payload: newBlock.id });
      } else if (active.id !== over.id) {
        // Reordenar bloques existentes en el canvas
        dispatch({
          type: 'REORDER_BLOCKS',
          payload: { activeId: String(active.id), overId: String(over.id) },
        });
      }
    },
    [state.blocks.length, maxBlocks, canUseBlock, toast]
  );

  const handleDragStart = useCallback((_event: DragStartEvent) => {
    // Reservado para feedback visual futuro
  }, []);

  const handleSaveDraft = useCallback(async () => {
    // Protección: no guardar si no hay bloques
    if (!state.blocks || state.blocks.length === 0) {
      toast({
        title: 'No hay bloques',
        description: 'Agrega al menos un bloque antes de guardar.',
        variant: 'destructive',
      });
      return;
    }

    dispatch({ type: 'SET_SAVING', payload: true });
    try {
      await saveBlocksAsync(state.blocks, true);
      dispatch({ type: 'SET_DIRTY', payload: false });
      toast({
        title: 'Borrador guardado',
        description: 'Tus cambios se guardaron como borrador.',
      });
    } catch (err) {
      console.error('Error saving draft:', err);
      toast({
        title: 'Error al guardar',
        description: 'No se pudo guardar el borrador. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [state.blocks, saveBlocksAsync, toast]);

  const handlePublish = useCallback(async () => {
    // Protección: no publicar si no hay bloques
    if (!state.blocks || state.blocks.length === 0) {
      toast({
        title: 'No hay bloques',
        description: 'Agrega al menos un bloque antes de publicar.',
        variant: 'destructive',
      });
      return;
    }

    console.log('[handlePublish] Iniciando publicación...');
    console.log('[handlePublish] Bloques a guardar:', state.blocks.length);
    console.log('[handlePublish] Config:', state.builderConfig);

    dispatch({ type: 'SET_SAVING', payload: true });
    try {
      // 1. Guardar la configuración del builder (tema, colores, fuentes)
      console.log('[handlePublish] Paso 1: Guardando config...');
      await saveBuilderConfigAsync(state.builderConfig);
      console.log('[handlePublish] Config guardada OK');

      // 2. Guardar bloques como publicados (isDraft: false)
      // Esto elimina todos los bloques existentes y los reinserta como publicados
      console.log('[handlePublish] Paso 2: Guardando bloques como publicados...');
      console.log('[handlePublish] Bloques:', JSON.stringify(state.blocks.map(b => ({
        id: b.id,
        type: b.type,
        orderIndex: b.orderIndex,
        content: b.content,
      }))));
      await saveBlocksAsync(state.blocks, false);
      console.log('[handlePublish] Bloques guardados como publicados OK');

      // Nota: No llamamos a publishBlocks() porque saveBlocksAsync con isDraft=false
      // ya guarda los bloques como publicados directamente

      dispatch({ type: 'SET_DIRTY', payload: false });
      toast({
        title: 'Perfil publicado',
        description: 'Tu perfil personalizado ya es visible en el marketplace.',
      });
    } catch (err) {
      console.error('[handlePublish] Error:', err);
      toast({
        title: 'Error al publicar',
        description: err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [state.blocks, state.builderConfig, saveBlocksAsync, saveBuilderConfigAsync, toast]);

  const handlePreview = useCallback(async () => {
    const token = await generatePreviewTokenAsync();
    if (token) {
      window.open(`/preview/${token}`, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo generar el enlace de vista previa.',
        variant: 'destructive',
      });
    }
  }, [generatePreviewTokenAsync, toast]);

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

  // Handler para agregar un bloque a un contenedor (columns, container, section)
  const handleAddBlockToContainer = useCallback(
    (parentId: string, columnIndex?: number) => {
      // Por ahora creamos un bloque de texto por defecto
      // En el futuro se podría mostrar un selector de bloques
      const newBlock = createBlock('text_block', 0);
      dispatch({
        type: 'ADD_BLOCK_TO_CONTAINER',
        payload: { parentId, block: newBlock, columnIndex },
      });
      dispatch({ type: 'SELECT_BLOCK', payload: newBlock.id });
    },
    []
  );

  // Handler para remover un bloque de un contenedor
  const handleRemoveFromContainer = useCallback(
    (parentId: string, blockId: string) => {
      dispatch({
        type: 'REMOVE_FROM_CONTAINER',
        payload: { parentId, blockId },
      });
    },
    []
  );

  // Handler para seleccionar una plantilla
  const handleSelectTemplate = useCallback(
    (template: ProfileTemplate) => {
      let newBlocks: ProfileBlock[];

      // Si hay datos del marketplace, generar bloques con contenido real
      if (marketplaceData?.profile) {
        const templateData: CreatorDataForTemplate = {
          profile: marketplaceData.profile,
          portfolioItems: marketplaceData.portfolioItems || [],
          services: marketplaceData.services || [],
          reviews: marketplaceData.reviews || [],
          trustStats: marketplaceData.trustStats || undefined,
          specializations: marketplaceData.specializations?.map((s) => s.name) || [],
        };
        newBlocks = generateBlocksFromTemplate(template, templateData);
      } else {
        // Fallback: usar bloques vacios de la plantilla
        newBlocks = template.blocks.map((templateBlock, index) => ({
          ...templateBlock,
          id: crypto.randomUUID(),
          isDraft: false,
          orderIndex: index,
        }));
      }

      // Aplicar bloques de la plantilla
      dispatch({ type: 'SET_BLOCKS', payload: newBlocks });

      // Aplicar configuracion de la plantilla
      dispatch({ type: 'SET_BUILDER_CONFIG', payload: template.config });

      // Guardar nombre de plantilla actual
      setCurrentTemplate(template.name);

      // Marcar como dirty para que se pueda guardar
      dispatch({ type: 'SET_DIRTY', payload: true });

      toast({
        title: 'Plantilla aplicada',
        description: `Se ha aplicado la plantilla "${template.label}" con ${newBlocks.length} bloques.`,
      });
    },
    [marketplaceData, toast]
  );

  const selectedBlock = state.blocks.find((b) => b.id === state.selectedBlockId) ?? null;

  // Handler para seleccionar plan desde el modal
  const handleSelectPlan = useCallback((selectedTier: typeof tier) => {
    // TODO: Integrar con checkout de Stripe
    setShowUpgradeModal(false);
    window.open('/pricing?plan=' + selectedTier, '_blank');
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        {/* Barra de estado del plan */}
        <PlanStatusBar
          currentBlockCount={state.blocks.length}
          onUpgradeClick={() => setShowUpgradeModal(true)}
        />

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
          onOpenTemplates={() => setShowTemplateSelector(true)}
        />

        {/* Body: sidebar | canvas | settings */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar izquierdo — oculto en mobile */}
          <div className="hidden md:flex">
            <BuilderSidebar
              blocks={state.blocks}
              builderConfig={state.builderConfig}
              onConfigChange={handleConfigChange}
              onUpgradeClick={() => setShowUpgradeModal(true)}
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
                    onUpgradeClick={() => setShowUpgradeModal(true)}
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
                      userId={profile?.user_id}
                      creatorProfileId={profileId}
                      previewDevice={state.previewDevice}
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
              userId={profile?.user_id}
              creatorProfileId={profileId}
              onAddBlockToContainer={handleAddBlockToContainer}
              onRemoveFromContainer={handleRemoveFromContainer}
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
                      userId={profile?.user_id}
                      creatorProfileId={profileId}
                      previewDevice={state.previewDevice}
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

      {/* Modal de upgrade */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={tier}
        onSelectPlan={handleSelectPlan}
      />

      {/* Selector de plantillas */}
      <TemplateSelector
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
        currentTemplate={currentTemplate}
        onSelectTemplate={handleSelectTemplate}
        onUpgradeClick={() => {
          setShowTemplateSelector(false);
          setShowUpgradeModal(true);
        }}
      />
    </DndContext>
  );
}
