import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { BlockProps } from '../types/profile-builder';

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

function SectionBlockComponent({ block, isEditing, isSelected }: BlockProps) {
  const config = block.config as SectionConfig;
  const content = block.content as SectionContent;
  const styles = block.styles;

  const paddingClasses = {
    none: 'p-0',
    sm: 'py-8 px-4',
    md: 'py-12 px-6',
    lg: 'py-16 px-8',
    xl: 'py-24 px-12',
  };

  const hasBackground = config.backgroundType === 'image' || config.backgroundType === 'video';
  const overlayOpacity = content.overlayOpacity ?? 50;

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

      {/* Content placeholder */}
      <div className="relative z-10 max-w-6xl mx-auto">
        {isEditing ? (
          <div className="text-center py-8 border-2 border-dashed border-border/50 rounded-lg">
            <p className="text-muted-foreground text-sm">
              Seccion - Arrastra bloques aqui
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground/50 text-sm italic">
              Seccion vacia
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export const SectionBlock = memo(SectionBlockComponent);
