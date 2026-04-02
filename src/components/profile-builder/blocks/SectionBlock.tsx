/**
 * Section Block - Profile Builder Pro
 *
 * Contenedor con fondo personalizable (color, gradiente, imagen, video).
 * Puede contener otros bloques anidados con drag & drop.
 */

import { memo, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { LayoutPanelTop, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { BlockProps, ProfileBlock } from '../types/profile-builder';

interface SectionConfig {
  backgroundType: 'color' | 'gradient' | 'image' | 'video';
  fullWidth: boolean;
  minHeight: 'auto' | 'sm' | 'md' | 'lg' | 'xl' | 'screen';
}

interface SectionContent {
  backgroundUrl?: string;
  overlayColor?: string;
  overlayOpacity?: number;
}

const minHeightClasses = {
  auto: '',
  sm: 'min-h-[200px]',
  md: 'min-h-[400px]',
  lg: 'min-h-[600px]',
  xl: 'min-h-[800px]',
  screen: 'min-h-screen',
};

// Props extendidas para SectionBlock
interface SectionBlockProps extends BlockProps {
  renderChild?: (child: ProfileBlock) => React.ReactNode;
  onAddBlockToColumn?: (columnIndex: number) => void;
  onRemoveChild?: (childId: string) => void;
}

function SectionBlockComponent({
  block,
  isEditing,
  isSelected,
  renderChild,
  onAddBlockToColumn,
  onRemoveChild,
}: SectionBlockProps) {
  const config = block.config as SectionConfig;
  const content = block.content as SectionContent;
  const styles = block.styles;
  const children = block.children || [];
  const hasChildren = children.length > 0;

  const paddingClasses = {
    none: 'p-0',
    sm: 'py-8 px-4',
    md: 'py-12 px-6',
    lg: 'py-16 px-8',
    xl: 'py-24 px-12',
  };

  const hasBackground = config.backgroundType === 'image' || config.backgroundType === 'video';
  const overlayOpacity = content.overlayOpacity ?? 50;

  // Drop zone para la seccion
  const { setNodeRef, isOver } = useDroppable({
    id: `section-${block.id}`,
    data: {
      type: 'column',
      parentId: block.id,
      columnIndex: 0,
      accepts: ['block'],
    },
  });

  const handleAddBlock = useCallback(() => {
    onAddBlockToColumn?.(0);
  }, [onAddBlockToColumn]);

  return (
    <section
      className={cn(
        'relative w-full overflow-hidden',
        paddingClasses[styles.padding || 'lg'],
        minHeightClasses[config.minHeight || 'auto'],
        styles.borderRadius === 'sm' && 'rounded-sm',
        styles.borderRadius === 'md' && 'rounded-md',
        styles.borderRadius === 'lg' && 'rounded-lg',
        isEditing && isSelected && 'ring-2 ring-primary/50',
      )}
      style={{
        backgroundColor: config.backgroundType === 'color' ? styles.backgroundColor : undefined,
        backgroundImage: config.backgroundType === 'gradient' ? styles.backgroundGradient :
                        (config.backgroundType === 'image' && content.backgroundUrl)
                          ? `url(${content.backgroundUrl})` : undefined,
        backgroundSize: styles.backgroundSize || 'cover',
        backgroundPosition: styles.backgroundPosition || 'center',
      }}
    >
      {/* Video background */}
      {config.backgroundType === 'video' && content.backgroundUrl && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src={content.backgroundUrl}
        />
      )}

      {/* Overlay */}
      {hasBackground && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: content.overlayColor || 'rgba(0,0,0,0.5)',
            opacity: overlayOpacity / 100,
          }}
        />
      )}

      {/* Content con drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'relative z-10 max-w-6xl mx-auto min-h-[100px]',
          isEditing && 'border-2 border-dashed rounded-lg transition-all',
          isEditing && !hasChildren && 'border-border/40',
          isOver && 'border-primary bg-primary/5 border-solid',
        )}
      >
        {hasChildren ? (
          <div className="space-y-2 p-4">
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
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <LayoutPanelTop className="h-8 w-8 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Seccion vacia
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Arrastra bloques aqui
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
    </section>
  );
}

export const SectionBlock = memo(SectionBlockComponent);
