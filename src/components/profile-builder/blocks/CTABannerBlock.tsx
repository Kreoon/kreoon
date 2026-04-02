import { memo, useState } from 'react';
import { Pencil, ArrowRight } from 'lucide-react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { BlockProps } from '../types/profile-builder';
import { TextFormatPopup, useTextFormatPopup } from '../TextFormatPopup';

// Renderiza HTML sanitizado
function SafeHtml({ html, className }: { html: string; className?: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'span', 'p', 'br'],
    ALLOWED_ATTR: ['style', 'class'],
  });
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

function isHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

interface CTABannerConfig {
  headline: string;
  subtext: string;
  buttonText: string;
  buttonUrl: string;
  showSecondaryButton: boolean;
  secondaryButtonText: string;
  secondaryButtonUrl: string;
}

function CTABannerBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const config = block.config as CTABannerConfig;
  const styles = block.styles;
  const [localButtonText, setLocalButtonText] = useState(config.buttonText || 'Contactar ahora');

  const {
    isOpen,
    editingField,
    editingContent,
    openEditor,
    closeEditor,
  } = useTextFormatPopup();

  const handleSave = (newContent: string) => {
    if (editingField) {
      onUpdate({
        config: { ...config, [editingField]: newContent },
      });
    }
    closeEditor();
  };

  const handleButtonBlur = () => {
    onUpdate({
      config: { ...config, buttonText: localButtonText },
    });
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-6',
    md: 'p-8',
    lg: 'p-12',
    xl: 'p-16',
  };

  const borderRadiusClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-xl',
    full: 'rounded-3xl',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        paddingClasses[styles.padding || 'xl'],
        borderRadiusClasses[styles.borderRadius || 'lg'],
        styles.margin === 'sm' && 'my-2',
        styles.margin === 'md' && 'my-4',
        styles.margin === 'lg' && 'my-8',
        styles.margin === 'xl' && 'my-12',
        isEditing && isSelected && 'ring-2 ring-primary/50',
      )}
      style={{
        background: styles.backgroundGradient || 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
      }}
    >
      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Headline - Editable */}
        <div
          className={cn(
            'group relative mb-4',
            isEditing && isSelected && 'cursor-pointer hover:bg-white/10 rounded-md py-1 transition-colors'
          )}
          onClick={() => isEditing && isSelected && openEditor('headline', config.headline || 'Listo para comenzar?')}
        >
          {isHtml(config.headline || '') ? (
            <SafeHtml
              html={config.headline || 'Listo para comenzar?'}
              className="text-2xl md:text-3xl lg:text-4xl font-bold text-white"
            />
          ) : (
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
              {config.headline || 'Listo para comenzar?'}
            </h2>
          )}
          {isEditing && isSelected && (
            <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* Subtext - Editable */}
        <div
          className={cn(
            'group relative mb-6',
            isEditing && isSelected && 'cursor-pointer hover:bg-white/10 rounded-md py-1 transition-colors'
          )}
          onClick={() => isEditing && isSelected && openEditor('subtext', config.subtext || '')}
        >
          {config.subtext ? (
            isHtml(config.subtext) ? (
              <SafeHtml html={config.subtext} className="text-lg text-white/90" />
            ) : (
              <p className="text-lg text-white/90">{config.subtext}</p>
            )
          ) : isEditing && isSelected ? (
            <span className="text-white/40 italic">Haz clic para agregar descripcion...</span>
          ) : null}
          {isEditing && isSelected && config.subtext && (
            <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isEditing && isSelected ? (
            <input
              type="text"
              value={localButtonText}
              onChange={(e) => setLocalButtonText(e.target.value)}
              onBlur={handleButtonBlur}
              className="px-6 py-3 bg-white text-violet-600 rounded-lg font-semibold text-center"
            />
          ) : (
            <Button
              size="lg"
              className="bg-white text-violet-600 hover:bg-white/90 font-semibold px-8"
              asChild
            >
              <a href={config.buttonUrl || '#contact'}>
                {config.buttonText || 'Contactar ahora'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}

          {config.showSecondaryButton && !isEditing && (
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 font-semibold px-8"
              asChild
            >
              <a href={config.secondaryButtonUrl || '#portfolio'}>
                {config.secondaryButtonText || 'Ver portfolio'}
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

      {/* Editor Popup */}
      <TextFormatPopup
        open={isOpen}
        onOpenChange={(open) => !open && closeEditor()}
        initialContent={editingContent}
        onSave={handleSave}
        title={editingField === 'headline' ? 'Editar titulo' : 'Editar descripcion'}
        placeholder={editingField === 'headline' ? 'Escribe tu titulo...' : 'Escribe una descripcion...'}
        mode={editingField === 'headline' ? 'inline' : 'block'}
      />
    </div>
  );
}

export const CTABannerBlock = memo(CTABannerBlockComponent);
