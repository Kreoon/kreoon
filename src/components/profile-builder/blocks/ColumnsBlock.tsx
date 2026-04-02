/**
 * Columns Block - Profile Builder Pro
 *
 * Grid de 2-6 columnas responsivas.
 * Cada columna puede contener bloques anidados.
 * Soporta drag & drop para agregar bloques a columnas.
 */

import { memo, useMemo, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Columns3, Plus, GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { BlockProps, ProfileBlock } from '../types/profile-builder';

interface ColumnsConfig {
  columns: 2 | 3 | 4 | 5 | 6;
  gap: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  mobileStack: boolean;
  equalHeight: boolean;
  columnWidths?: string[]; // ej: ['33%', '67%'] para distribucion custom
}

const gapClasses = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

const columnGridClasses = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
};

const paddingClasses = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

// Componente de columna droppable
interface ColumnDropZoneProps {
  parentId: string;
  columnIndex: number;
  children: ProfileBlock[];
  isEditing: boolean;
  isSelected: boolean;
  onAddBlock?: (columnIndex: number) => void;
  renderChild?: (child: ProfileBlock) => React.ReactNode;
  onRemoveChild?: (childId: string) => void;
}

function ColumnDropZone({
  parentId,
  columnIndex,
  children,
  isEditing,
  isSelected,
  onAddBlock,
  renderChild,
  onRemoveChild,
}: ColumnDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${parentId}-${columnIndex}`,
    data: {
      type: 'column',
      parentId,
      columnIndex,
      accepts: ['block'],
    },
  });

  const hasChildren = children.length > 0;

  return (
    <div
      ref={setNodeRef}
      data-column-index={columnIndex}
      data-parent-id={parentId}
      className={cn(
        'min-h-[80px] rounded-md transition-all',
        isEditing && 'border-2 border-dashed',
        isEditing && !hasChildren && 'flex flex-col items-center justify-center',
        isEditing && isSelected && 'border-primary/30 hover:border-primary/50',
        !isEditing && !hasChildren && 'hidden',
        isOver && 'border-primary bg-primary/5 border-solid',
        !isOver && isEditing && 'border-border/40',
        hasChildren && 'p-2',
      )}
    >
      {hasChildren ? (
        <div className="space-y-2">
          {children.map((child) => (
            <div key={child.id} className="relative group">
              {renderChild ? (
                renderChild(child)
              ) : (
                <div className="p-3 bg-muted/30 rounded border border-border/30 text-sm">
                  {child.type}
                </div>
              )}
              {/* Controles de bloque anidado */}
              {isEditing && isSelected && (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                  <button
                    className="p-1 rounded bg-background/80 text-muted-foreground hover:text-foreground"
                    title="Mover"
                  >
                    <GripVertical className="h-3 w-3" />
                  </button>
                  {onRemoveChild && (
                    <button
                      onClick={() => onRemoveChild(child.id)}
                      className="p-1 rounded bg-background/80 text-muted-foreground hover:text-destructive"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : isEditing ? (
        <div className="text-center p-4">
          <Columns3 className="h-5 w-5 text-muted-foreground/40 mx-auto mb-2" />
          <span className="text-muted-foreground/60 text-xs block">
            Columna {columnIndex + 1}
          </span>
          {onAddBlock && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs gap-1 opacity-60 hover:opacity-100"
              onClick={() => onAddBlock(columnIndex)}
            >
              <Plus className="h-3 w-3" />
              Agregar
            </Button>
          )}
          {isOver && (
            <p className="text-xs text-primary mt-2">Soltar aqui</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

// Props extendidas para ColumnsBlock
interface ColumnsBlockProps extends BlockProps {
  onAddBlockToColumn?: (columnIndex: number) => void;
  renderChild?: (child: ProfileBlock) => React.ReactNode;
  onRemoveChild?: (childId: string) => void;
}

function ColumnsBlockComponent({
  block,
  isEditing,
  isSelected,
  onAddBlockToColumn,
  renderChild,
  onRemoveChild,
}: ColumnsBlockProps) {
  const config = block.config as ColumnsConfig;
  const styles = block.styles;
  const cols = config.columns || 2;

  // Agrupar children por columnIndex
  const columnChildren = useMemo(() => {
    const result: Record<number, ProfileBlock[]> = {};
    for (let i = 0; i < cols; i++) {
      result[i] = [];
    }

    if (block.children) {
      block.children.forEach((child) => {
        const colIndex = child.columnIndex ?? 0;
        if (colIndex >= 0 && colIndex < cols) {
          result[colIndex].push(child);
        }
      });
    }

    return result;
  }, [block.children, cols]);

  // Verificar si tiene contenido en alguna columna
  const hasAnyContent = useMemo(() => {
    return Object.values(columnChildren).some((children) => children.length > 0);
  }, [columnChildren]);

  const handleAddBlock = useCallback((columnIndex: number) => {
    onAddBlockToColumn?.(columnIndex);
  }, [onAddBlockToColumn]);

  return (
    <div
      className={cn(
        paddingClasses[styles.padding || 'md'],
        styles.margin === 'sm' && 'my-2',
        styles.margin === 'md' && 'my-4',
        styles.margin === 'lg' && 'my-6',
        styles.margin === 'xl' && 'my-8',
        styles.borderRadius === 'sm' && 'rounded-sm',
        styles.borderRadius === 'md' && 'rounded-md',
        styles.borderRadius === 'lg' && 'rounded-lg',
      )}
      style={{
        backgroundColor: styles.backgroundColor,
      }}
    >
      <div
        className={cn(
          'grid grid-cols-1',
          config.mobileStack !== false && columnGridClasses[cols],
          !config.mobileStack && columnGridClasses[cols].replace('md:', ''),
          gapClasses[config.gap || 'md'],
          config.equalHeight && 'items-stretch',
        )}
        style={
          config.columnWidths?.length === cols
            ? {
                gridTemplateColumns: config.columnWidths.join(' '),
              }
            : undefined
        }
      >
        {Array.from({ length: cols }).map((_, index) => (
          <ColumnDropZone
            key={index}
            parentId={block.id}
            columnIndex={index}
            children={columnChildren[index] || []}
            isEditing={isEditing}
            isSelected={isSelected}
            onAddBlock={handleAddBlock}
            renderChild={renderChild}
            onRemoveChild={onRemoveChild}
          />
        ))}
      </div>

      {/* Indicador de columnas en modo edicion */}
      {isEditing && !hasAnyContent && (
        <p className="text-xs text-muted-foreground/50 text-center mt-2">
          {cols} columnas • Arrastra bloques a cada columna
        </p>
      )}
    </div>
  );
}

export const ColumnsBlock = memo(ColumnsBlockComponent);
