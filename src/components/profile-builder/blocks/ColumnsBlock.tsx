import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { BlockProps } from '../types/profile-builder';

interface ColumnsConfig {
  columns: 2 | 3 | 4 | 5 | 6;
  gap: 'none' | 'sm' | 'md' | 'lg';
  mobileStack: boolean;
  equalHeight: boolean;
}

const gapClasses = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-8',
};

const columnClasses = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

function ColumnsBlockComponent({ block, isEditing, isSelected }: BlockProps) {
  const config = block.config as ColumnsConfig;
  const styles = block.styles;

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
  };

  const cols = config.columns || 2;

  return (
    <div
      className={cn(
        paddingClasses[styles.padding || 'md'],
        styles.margin === 'sm' && 'my-2',
        styles.margin === 'md' && 'my-4',
        styles.margin === 'lg' && 'my-6',
        styles.margin === 'xl' && 'my-8',
      )}
      style={{
        backgroundColor: styles.backgroundColor,
      }}
    >
      <div
        className={cn(
          'grid',
          config.mobileStack ? 'grid-cols-1 md:' + columnClasses[cols] : columnClasses[cols],
          gapClasses[config.gap || 'md'],
          config.equalHeight && 'items-stretch',
          isEditing && isSelected && 'ring-2 ring-primary/50 rounded-lg',
        )}
      >
        {Array.from({ length: cols }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'min-h-[100px] rounded-md',
              isEditing && 'border-2 border-dashed border-border/50 flex items-center justify-center',
            )}
          >
            {isEditing ? (
              <span className="text-muted-foreground text-xs">
                Columna {index + 1}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export const ColumnsBlock = memo(ColumnsBlockComponent);
