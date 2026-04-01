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
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LayoutTemplate } from 'lucide-react';
import { BlockWrapper } from './BlockWrapper';
import { BlockRenderer } from './BlockRenderer';
import { DropZone } from './DropZone';
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
}

export function BuilderCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onUpdateBlock,
  onReorderBlocks,
  onDeleteBlock,
  previewDevice,
}: BuilderCanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const sortedBlocks = [...blocks].sort((a, b) => a.orderIndex - b.orderIndex);
  const blockIds = sortedBlocks.map((b) => b.id);
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

  function getBlockIndex(id: string) {
    return sortedBlocks.findIndex((b) => b.id === id);
  }

  function handleMoveUp(id: string) {
    const index = getBlockIndex(id);
    if (index <= 0) return;
    const prevBlock = sortedBlocks[index - 1];
    onReorderBlocks(id, prevBlock.id);
  }

  function handleMoveDown(id: string) {
    const index = getBlockIndex(id);
    if (index >= sortedBlocks.length - 1) return;
    const nextBlock = sortedBlocks[index + 1];
    onReorderBlocks(nextBlock.id, id);
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
        {/* Estado vacío */}
        {sortedBlocks.length === 0 && (
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-4',
              'h-80 rounded-lg border-2 border-dashed',
              'border-zinc-700 bg-zinc-900/50',
            )}
            aria-label="Canvas vacío"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800">
              <LayoutTemplate className="h-6 w-6 text-zinc-500" aria-hidden="true" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-400">Arrastra bloques aquí</p>
              <p className="mt-1 text-xs text-zinc-600">
                Selecciona bloques del panel izquierdo para construir tu perfil
              </p>
            </div>
            <DropZone id="canvas-empty-drop" className="w-48" />
          </div>
        )}

        {/* Lista sortable de bloques */}
        {sortedBlocks.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-1.5" role="list" aria-label="Bloques del perfil">
                {sortedBlocks.map((block, index) => {
                  const definition = BLOCK_DEFINITIONS[block.type];
                  const isFirst = index === 0;
                  const isLast = index === sortedBlocks.length - 1;

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
                        />
                      </BlockWrapper>
                    </div>
                  );
                })}
              </div>
            </SortableContext>

            {/* DragOverlay: preview flotante al arrastrar */}
            <DragOverlay>
              {activeBlock && (
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
