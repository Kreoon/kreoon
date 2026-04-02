/**
 * Container Block - Profile Builder Pro
 *
 * Contenedor simple con ancho maximo centrado.
 * Puede contener otros bloques anidados.
 */

import { memo } from 'react';
import { BoxSelect, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { BlockProps } from '../types/profile-builder';

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

function ContainerBlockComponent({ block, isEditing, isSelected }: BlockProps) {
  const config = block.config as ContainerConfig;
  const styles = block.styles;
  const hasChildren = block.children && block.children.length > 0;

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
        className={cn(
          'w-full',
          config.centered && 'mx-auto',
        )}
        style={{
          maxWidth: config.maxWidth || '1200px',
        }}
      >
        {hasChildren ? (
          <div className="space-y-4">
            {/* Los children se renderizan desde el BuilderCanvas */}
            <div className="text-xs text-muted-foreground text-center py-2 border border-dashed border-border rounded">
              {block.children?.length} bloques anidados
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'flex flex-col items-center justify-center py-12 gap-3',
              'border-2 border-dashed border-muted-foreground/30 rounded-lg',
              'transition-colors min-h-[150px]',
              isSelected && 'border-primary/50 bg-primary/5'
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
              <Button variant="outline" size="sm" className="gap-1.5 mt-2">
                <Plus className="h-3.5 w-3.5" />
                Agregar bloque
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const ContainerBlock = memo(ContainerBlockComponent);
