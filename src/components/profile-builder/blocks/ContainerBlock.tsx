/**
 * Container Block - Profile Builder Pro
 *
 * Contenedor simple con ancho maximo centrado.
 * Puede contener otros bloques anidados con drag & drop.
 */

import { memo, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { BoxSelect, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { BlockProps, ProfileBlock } from '../types/profile-builder';

interface ContainerConfig {
  maxWidth: string;
  centered: boolean;
}

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
};

// Props extendidas para ContainerBlock
interface ContainerBlockProps extends BlockProps {
  renderChild?: (child: ProfileBlock) => React.ReactNode;
  onAddBlockToColumn?: (columnIndex: number) => void;
  onRemoveChild?: (childId: string) => void;
}

function ContainerBlockComponent({
  block,
  isEditing,
  isSelected,
  renderChild,
  onAddBlockToColumn,
  onRemoveChild,
}: ContainerBlockProps) {
  const config = block.config as ContainerConfig;
  const styles = block.styles;
  const children = block.children || [];
  const hasChildren = children.length > 0;

  // Drop zone para el contenedor
  const { setNodeRef, isOver } = useDroppable({
    id: `container-${block.id}`,
    data: {
      type: 'column',
      parentId: block.id,
      columnIndex: 0, // Contenedor solo tiene una "columna"
      accepts: ['block'],
    },
  });

  const handleAddBlock = useCallback(() => {
    onAddBlockToColumn?.(0);
  }, [onAddBlockToColumn]);

  return (
    <div
      className={cn(
        'w-full',
        paddingClasses[styles.padding || 'md'],
        styles.margin === 'sm' && 'my-2',
        styles.margin === 'md' && 'my-4',
        styles.margin === 'lg' && 'my-6',
        styles.margin === 'xl' && 'my-8',
        isEditing && isSelected && 'ring-2 ring-primary/30 rounded-lg',
      )}
      style={{
        backgroundColor: styles.backgroundColor,
      }}
    >
      <div
        ref={setNodeRef}
        className={cn(
          'w-full min-h-[100px]',
          config.centered && 'mx-auto',
          isEditing && 'border-2 border-dashed rounded-lg transition-all',
          isEditing && !hasChildren && 'border-border/40',
          isOver && 'border-primary bg-primary/5 border-solid',
        )}
        style={{
          maxWidth: config.maxWidth || '1200px',
        }}
      >
        {hasChildren ? (
          <div className="space-y-2 p-2">
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
                {isEditing && isSelected && onRemoveChild && (
                  <button
                    onClick={() => onRemoveChild(child.id)}
                    className="absolute top-1 right-1 p-1 rounded bg-background/80 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}

            {/* Boton para agregar mas bloques */}
            {isEditing && isSelected && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 opacity-60 hover:opacity-100"
                  onClick={handleAddBlock}
                >
                  <Plus className="h-3 w-3" />
                  Agregar
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              'flex flex-col items-center justify-center py-12 gap-3',
              'transition-colors min-h-[150px]',
            )}
          >
            <BoxSelect className="h-8 w-8 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Contenedor vacio
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Arrastra bloques aqui para agruparlos
              </p>
            </div>
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 mt-2"
                onClick={handleAddBlock}
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar bloque
              </Button>
            )}
            {isOver && (
              <p className="text-xs text-primary mt-2">Soltar aqui</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const ContainerBlock = memo(ContainerBlockComponent);
