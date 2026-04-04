import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { BlockProps } from '../types/profile-builder';
import { getBlockStyleObject } from './blockStyles';

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

  const dividerStyle = config.style || 'solid';
  const dividerColor = styles.backgroundColor;

  // Estilos inline para color personalizable
  const lineStyle: React.CSSProperties = {};
  if (dividerColor) {
    if (dividerStyle === 'solid') {
      lineStyle.backgroundColor = dividerColor;
    } else if (dividerStyle === 'dashed' || dividerStyle === 'dotted') {
      lineStyle.borderColor = dividerColor;
    } else if (dividerStyle === 'gradient') {
      lineStyle.backgroundImage = `linear-gradient(to right, transparent, ${dividerColor}, transparent)`;
    }
  }

  const isDashedOrDotted = dividerStyle === 'dashed' || dividerStyle === 'dotted';

  // Estilos del contenedor (permite personalización vía StylesPanel)
  const containerStyles = getBlockStyleObject(block.styles);
  // Excluir margin del contenedor ya que se maneja con marginClasses
  const { margin: _margin, ...restContainerStyles } = containerStyles;

  return (
    <div
      className={cn('flex justify-center', marginClasses[styles.margin || 'md'])}
      style={restContainerStyles}
    >
      <div
        className={cn(
          widthClasses[config.width || 'full'],
          !isDashedOrDotted && thicknessClasses[config.thickness || 'normal'],
          !dividerColor && dividerStyle === 'solid' && 'bg-border',
          dividerStyle === 'dashed' && 'border-t-2 border-dashed bg-transparent h-0',
          !dividerColor && dividerStyle === 'dashed' && 'border-border',
          dividerStyle === 'dotted' && 'border-t-2 border-dotted bg-transparent h-0',
          !dividerColor && dividerStyle === 'dotted' && 'border-border',
          dividerStyle === 'gradient' && !dividerColor && 'bg-gradient-to-r from-transparent via-border to-transparent',
        )}
        style={lineStyle}
      />
    </div>
  );
}

export const DividerBlock = memo(DividerBlockComponent);
