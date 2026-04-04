import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { BlockProps } from '../types/profile-builder';
import { getBlockStyleObject } from './blockStyles';

interface SpacerConfig {
  height: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

function SpacerBlockComponent({ block, isEditing, isSelected }: BlockProps) {
  const config = block.config as SpacerConfig;

  const heightClasses = {
    xs: 'h-4',
    sm: 'h-8',
    md: 'h-16',
    lg: 'h-24',
    xl: 'h-32',
    '2xl': 'h-48',
  };

  // Combinar estilos del bloque con altura del spacer
  const blockStyles = getBlockStyleObject(block.styles);

  return (
    <div
      className={cn(
        heightClasses[config.height || 'md'],
        isEditing && isSelected && 'bg-primary/5 border border-dashed border-primary/30 rounded',
        isEditing && !isSelected && 'border border-dashed border-border/30 rounded',
      )}
      style={blockStyles}
    >
      {isEditing && isSelected && (
        <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
          Espacio: {config.height || 'md'}
        </div>
      )}
    </div>
  );
}

export const SpacerBlock = memo(SpacerBlockComponent);
