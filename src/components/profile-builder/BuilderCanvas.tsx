import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { LayoutTemplate, Sparkles, TrendingDown, Crown, Users, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BlockWrapper } from './BlockWrapper';
import { BlockRenderer } from './BlockRenderer';
import { DropZone } from './DropZone';
import { useCreatorPlanFeatures } from '@/hooks/useCreatorPlanFeatures';
import type { ProfileBlock } from './types/profile-builder';
import { BLOCK_DEFINITIONS } from './types/profile-builder';

// Anchos de canvas según device
const DEVICE_WIDTH: Record<'desktop' | 'tablet' | 'mobile', string> = {
  desktop: 'w-full max-w-3xl',
  tablet: 'w-[768px] max-w-full',
  mobile: 'w-[390px] max-w-full',
};

interface BuilderCanvasProps {
  blocks: ProfileBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlock: (id: string, updates: Partial<ProfileBlock>) => void;
  onReorderBlocks: (activeId: string, overId: string) => void;
  onDeleteBlock?: (id: string) => void;
  previewDevice: 'desktop' | 'tablet' | 'mobile';
  // Para MediaLibraryPicker
  userId?: string;
  creatorProfileId?: string;
}

export function BuilderCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onUpdateBlock,
  onReorderBlocks,
  onDeleteBlock,
  previewDevice,
  userId,
  creatorProfileId,
}: BuilderCanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { tier, maxBlocks, commissionRate, isPremium, isFree, canDeleteRecommendedTalent, isBlockFixed } = useCreatorPlanFeatures();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Requiere un pequeño desplazamiento para activar drag (evita conflictos con click)
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Separar bloques fijos de movibles
  const { fixedTopBlock, fixedBottomBlock, movableBlocks } = useMemo(() => {
    const sorted = [...blocks].sort((a, b) => a.orderIndex - b.orderIndex);
    const top = sorted.find((b) => b.type === 'hero_banner');
    const bottom = sorted.find((b) => b.type === 'recommended_talent');
    const movable = sorted.filter(
      (b) => b.type !== 'hero_banner' && b.type !== 'recommended_talent'
    );
    return {
      fixedTopBlock: top,
      fixedBottomBlock: bottom,
      movableBlocks: movable,
    };
  }, [blocks]);

  const sortedBlocks = [...blocks].sort((a, b) => a.orderIndex - b.orderIndex);
  const movableBlockIds = movableBlocks.map((b) => b.id);
  const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    onReorderBlocks(String(active.id), String(over.id));
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  // Deseleccionar al hacer click en el canvas vacío
  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onSelectBlock(null);
    }
  }

  function getMovableBlockIndex(id: string) {
    return movableBlocks.findIndex((b) => b.id === id);
  }

  function handleMoveUp(id: string) {
    const index = getMovableBlockIndex(id);
    if (index <= 0) return;
    const prevBlock = movableBlocks[index - 1];
    onReorderBlocks(id, prevBlock.id);
  }

  function handleMoveDown(id: string) {
    const index = getMovableBlockIndex(id);
    if (index >= movableBlocks.length - 1) return;
    const nextBlock = movableBlocks[index + 1];
    onReorderBlocks(nextBlock.id, id);
  }

  // Renderiza un bloque fijo (sin drag, sin reorder)
  function renderFixedBlock(block: ProfileBlock, position: 'top' | 'bottom') {
    const definition = BLOCK_DEFINITIONS[block.type];
    const canDelete =
      block.type === 'recommended_talent' ? canDeleteRecommendedTalent : false;

    return (
      <div
        key={block.id}
        role="listitem"
        className="relative"
      >
        {/* Indicador de bloque fijo */}
        <div
          className={cn(
            'absolute -top-2 left-3 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium',
            position === 'top'
              ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400'
              : isFree
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                : 'bg-green-500/10 border border-green-500/30 text-green-400',
          )}
        >
          {position === 'top' ? (
            <>
              <Lock className="h-3 w-3" />
              Fijo arriba
            </>
          ) : isFree ? (
            <>
              <Lock className="h-3 w-3" />
              Requiere plan para eliminar
            </>
          ) : (
            <>
              <Users className="h-3 w-3" />
              Opcional
            </>
          )}
        </div>

        <BlockWrapper
          block={block}
          isSelected={selectedBlockId === block.id}
          onSelect={() => onSelectBlock(block.id)}
          onDelete={canDelete && onDeleteBlock ? () => onDeleteBlock(block.id) : undefined}
          onToggleVisibility={() => onUpdateBlock(block.id, { isVisible: !block.isVisible })}
          // Sin moveUp/moveDown para bloques fijos
        >
          <BlockRenderer
            block={block}
            isEditing={true}
            isSelected={selectedBlockId === block.id}
            onSelect={() => onSelectBlock(block.id)}
            onUpdate={(updates) => onUpdateBlock(block.id, updates)}
            userId={userId}
            creatorProfileId={creatorProfileId}
          />
        </BlockWrapper>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center w-full h-full overflow-y-auto py-8 px-4"
      onClick={handleCanvasClick}
      aria-label="Canvas del profile builder"
      role="main"
    >
      <div
        className={cn(
          'flex flex-col gap-0 mx-auto transition-all duration-200',
          DEVICE_WIDTH[previewDevice],
        )}
      >
        {/* Estado vacío - Onboarding freemium */}
        {sortedBlocks.length === 0 && (
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-5',
              'min-h-[400px] rounded-xl border-2 border-dashed',
              'border-zinc-700 bg-gradient-to-b from-zinc-900/80 to-zinc-950/50',
              'p-8',
            )}
            aria-label="Canvas vacío"
          >
            {/* Header */}
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-amber-500/20 border border-purple-500/20">
              <LayoutTemplate className="h-8 w-8 text-purple-400" aria-hidden="true" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-zinc-200">
                Construye tu perfil profesional
              </h3>
              <p className="text-sm text-zinc-500 max-w-sm">
                Arrastra bloques desde el panel izquierdo para crear tu portafolio y empezar a vender tus servicios
              </p>
            </div>

            {/* Info del plan */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Badge
                variant="outline"
                className={cn(
                  'gap-1.5 px-3 py-1',
                  isPremium
                    ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                    : 'border-zinc-700 text-zinc-400 bg-zinc-800/50'
                )}
              >
                {isPremium ? (
                  <Crown className="h-3.5 w-3.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {maxBlocks} bloques disponibles
              </Badge>

              <Badge
                variant="outline"
                className={cn(
                  'gap-1.5 px-3 py-1',
                  commissionRate <= 0.15
                    ? 'border-green-500/50 text-green-400 bg-green-500/10'
                    : 'border-zinc-700 text-zinc-400 bg-zinc-800/50'
                )}
              >
                <TrendingDown className="h-3.5 w-3.5" />
                {(commissionRate * 100).toFixed(0)}% comision
              </Badge>
            </div>

            {/* Drop zone */}
            <div className="mt-2">
              <DropZone id="canvas-empty-drop" className="w-56" />
              <p className="text-center text-[10px] text-zinc-600 mt-2">
                o haz clic en un bloque del panel
              </p>
            </div>
          </div>
        )}

        {/* Bloques con estructura: fijo arriba + movibles + fijo abajo */}
        {sortedBlocks.length > 0 && (
          <div className="flex flex-col gap-1.5" role="list" aria-label="Bloques del perfil">
            {/* Bloque fijo arriba (hero_banner) */}
            {fixedTopBlock && renderFixedBlock(fixedTopBlock, 'top')}

            {/* Bloques movibles con drag & drop */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext items={movableBlockIds} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1.5">
                  {movableBlocks.map((block, index) => {
                    const definition = BLOCK_DEFINITIONS[block.type];
                    const isFirst = index === 0;
                    const isLast = index === movableBlocks.length - 1;

                    return (
                      <div key={block.id} role="listitem">
                        <BlockWrapper
                          block={block}
                          isSelected={selectedBlockId === block.id}
                          onSelect={() => onSelectBlock(block.id)}
                          onDelete={
                            definition.isDeletable && onDeleteBlock
                              ? () => onDeleteBlock(block.id)
                              : undefined
                          }
                          onToggleVisibility={() =>
                            onUpdateBlock(block.id, { isVisible: !block.isVisible })
                          }
                          onMoveUp={!isFirst ? () => handleMoveUp(block.id) : undefined}
                          onMoveDown={!isLast ? () => handleMoveDown(block.id) : undefined}
                        >
                          <BlockRenderer
                            block={block}
                            isEditing={true}
                            isSelected={selectedBlockId === block.id}
                            onSelect={() => onSelectBlock(block.id)}
                            onUpdate={(updates) => onUpdateBlock(block.id, updates)}
                            userId={userId}
                            creatorProfileId={creatorProfileId}
                          />
                        </BlockWrapper>
                      </div>
                    );
                  })}
                </div>
              </SortableContext>

              {/* DragOverlay: preview flotante al arrastrar */}
              <DragOverlay>
                {activeBlock && !isBlockFixed(activeBlock.type) && (
                  <div
                    className={cn(
                      'rounded-lg border border-purple-500/60 bg-[#14141f]',
                      'shadow-2xl shadow-black/60 ring-2 ring-purple-500/30',
                      'pointer-events-none',
                    )}
                    aria-hidden="true"
                  >
                    <BlockRenderer
                      block={activeBlock}
                      isEditing={false}
                      isSelected={false}
                      onSelect={() => undefined}
                      onUpdate={() => undefined}
                    />
                  </div>
                )}
              </DragOverlay>
            </DndContext>

            {/* Bloque fijo abajo (recommended_talent) */}
            {fixedBottomBlock && renderFixedBlock(fixedBottomBlock, 'bottom')}
          </div>
        )}

        {/* Drop zone al final de la lista */}
        {sortedBlocks.length > 0 && (
          <div className="mt-2">
            <DropZone id="canvas-bottom-drop" />
          </div>
        )}
      </div>
    </div>
  );
}
