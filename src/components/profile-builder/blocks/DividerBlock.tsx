import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { BlockProps } from '../types/profile-builder';

interface DividerConfig {
  style: 'solid' | 'dashed' | 'dotted' | 'gradient';
  width: 'full' | 'wide' | 'normal' | 'narrow';
  thickness: 'thin' | 'normal' | 'thick';
}

function DividerBlockComponent({ block }: BlockProps) {
  const config = block.config as DividerConfig;
  const styles = block.styles;

  const marginClasses = {
    none: 'my-0',
    sm: 'my-2',
    md: 'my-6',
    lg: 'my-10',
    xl: 'my-16',
  };

  const widthClasses = {
    full: 'w-full',
    wide: 'w-3/4',
    normal: 'w-1/2',
    narrow: 'w-1/4',
  };

  const thicknessClasses = {
    thin: 'h-px',
    normal: 'h-0.5',
    thick: 'h-1',
  };

  const styleClasses = {
    solid: 'bg-border',
    dashed: 'border-t-2 border-dashed border-border bg-transparent h-0',
    dotted: 'border-t-2 border-dotted border-border bg-transparent h-0',
    gradient: 'bg-gradient-to-r from-transparent via-border to-transparent',
  };

  return (
    <div className={cn('flex justify-center', marginClasses[styles.margin || 'md'])}>
      <div
        className={cn(
          widthClasses[config.width || 'full'],
          config.style !== 'dashed' && config.style !== 'dotted' && thicknessClasses[config.thickness || 'normal'],
          styleClasses[config.style || 'solid'],
        )}
      />
    </div>
  );
}

export const DividerBlock = memo(DividerBlockComponent);
