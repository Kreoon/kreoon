/**
 * Columns Block - Profile Builder Pro
 *
 * Grid de 2-6 columnas responsivas.
 * Cada columna puede contener bloques anidados.
 */

import { memo, useMemo } from 'react';
import { Columns3, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { BlockProps, ProfileBlock } from '../types/profile-builder';

interface ColumnsConfig {
  columns: 2 | 3 | 4 | 5 | 6;
  gap: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  mobileStack: boolean;
  equalHeight: boolean;
  columnWidths?: string[]; // ej: ['33%', '67%'] para distribución custom
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

function ColumnsBlockComponent({ block, isEditing, isSelected }: BlockProps) {
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
          isEditing && isSelected && 'ring-2 ring-primary/30 rounded-lg p-1',
        )}
        style={
          config.columnWidths?.length === cols
            ? {
                gridTemplateColumns: config.columnWidths.join(' '),
              }
            : undefined
        }
      >
        {Array.from({ length: cols }).map((_, index) => {
          const childrenInColumn = columnChildren[index] || [];
          const hasChildren = childrenInColumn.length > 0;

          return (
            <div
              key={index}
              data-column-index={index}
              className={cn(
                'min-h-[80px] rounded-md transition-colors',
                isEditing && 'border-2 border-dashed border-border/40',
                isEditing && !hasChildren && 'flex flex-col items-center justify-center',
                isEditing && isSelected && 'border-primary/30 hover:border-primary/50',
                hasChildren && 'p-2',
              )}
            >
              {hasChildren ? (
                <div className="space-y-2">
                  {/* Los children se renderizan desde BuilderCanvas */}
                  <div className="text-[10px] text-muted-foreground text-center py-1 bg-muted/30 rounded">
                    {childrenInColumn.length} bloque{childrenInColumn.length > 1 ? 's' : ''}
                  </div>
                </div>
              ) : isEditing ? (
                <div className="text-center p-4">
                  <Columns3 className="h-5 w-5 text-muted-foreground/40 mx-auto mb-2" />
                  <span className="text-muted-foreground/60 text-xs block">
                    Columna {index + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs gap-1 opacity-60 hover:opacity-100"
                  >
                    <Plus className="h-3 w-3" />
                    Agregar
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Indicador de columnas en modo edición */}
      {isEditing && !hasAnyContent && (
        <p className="text-xs text-muted-foreground/50 text-center mt-2">
          {cols} columnas • Arrastra bloques a cada columna
        </p>
      )}
    </div>
  );
}

export const ColumnsBlock = memo(ColumnsBlockComponent);
