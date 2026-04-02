import { memo, useState } from 'react';
import { Camera, Pencil } from 'lucide-react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { BlockProps } from '../types/profile-builder';
import { TextFormatPopup, useTextFormatPopup } from '../TextFormatPopup';
import { MediaLibraryPicker } from '../media/MediaLibraryPicker';
import type { MediaItem } from '../media/types';

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

interface HeroBannerConfig {
  showAvatar: boolean;
  showName: boolean;
  showBio: boolean;
  showCTA: boolean;
  ctaText: string;
  ctaAction?: 'scroll-portfolio' | 'contact' | 'link';
  ctaUrl?: string;
  layout: 'centered' | 'left' | 'right';
}

interface HeroBannerContent {
  headline?: string;
  subheadline?: string;
  coverUrl?: string;
  avatarUrl?: string;
}

function HeroBannerBlockComponent({ block, isEditing, isSelected, onUpdate, userId, creatorProfileId }: BlockProps) {
  const config = block.config as HeroBannerConfig;
  const content = block.content as HeroBannerContent;
  const styles = block.styles;

  // Estado para media picker
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'coverUrl' | 'avatarUrl' | null>(null);

  const {
    isOpen,
    editingField,
    editingContent,
    openEditor,
    closeEditor,
  } = useTextFormatPopup();

  const handleContentUpdate = (updates: Partial<HeroBannerContent>) => {
    onUpdate({
      content: { ...content, ...updates },
    });
  };

  const handleSave = (newContent: string) => {
    if (editingField) {
      handleContentUpdate({ [editingField]: newContent });
    }
    closeEditor();
  };

  const openMediaPicker = (target: 'coverUrl' | 'avatarUrl') => {
    setMediaPickerTarget(target);
    setMediaPickerOpen(true);
  };

  // Handler para el CTA
  const handleCtaClick = () => {
    if (config.ctaAction === 'scroll-portfolio') {
      // Buscar el bloque de portfolio y hacer scroll
      const portfolioSection = document.querySelector('[data-block-type="portfolio"]');
      if (portfolioSection) {
        portfolioSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (config.ctaAction === 'link' && config.ctaUrl) {
      window.open(config.ctaUrl, '_blank');
    }
    // Default: no action (contacto se maneja diferente)
  };

  const handleMediaSelect = (media: MediaItem) => {
    if (mediaPickerTarget) {
      handleContentUpdate({ [mediaPickerTarget]: media.url });
    }
    setMediaPickerOpen(false);
    setMediaPickerTarget(null);
  };

  const layoutClasses = {
    centered: 'items-center text-center',
    left: 'items-start text-left',
    right: 'items-end text-right',
  };

  return (
    <div
      className={cn(
        'relative min-h-[300px] md:min-h-[400px] flex flex-col justify-end overflow-hidden',
        styles.borderRadius === 'md' && 'rounded-lg',
        styles.borderRadius === 'lg' && 'rounded-xl',
        styles.borderRadius === 'full' && 'rounded-3xl',
      )}
    >
      {/* Cover image/gradient */}
      <div className="absolute inset-0 -z-10">
        {content.coverUrl ? (
          <img
            src={content.coverUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500" />
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Edit cover button (solo en modo edicion) */}
      {isEditing && isSelected && userId && (
        <button
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          onClick={() => openMediaPicker('coverUrl')}
        >
          <Camera className="h-5 w-5" />
        </button>
      )}

      {/* Content */}
      <div
        className={cn(
          'relative z-10 flex flex-col gap-4 p-6 md:p-10',
          layoutClasses[config.layout || 'centered'],
        )}
      >
        {/* Avatar */}
        {config.showAvatar && (
          <div className="relative group">
            {content.avatarUrl ? (
              <img
                src={content.avatarUrl}
                alt=""
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white/20"
                loading="eager"
                decoding="async"
              />
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/10 flex items-center justify-center border-4 border-white/20">
                <span className="text-3xl md:text-4xl text-white/60">?</span>
              </div>
            )}
            {isEditing && isSelected && userId && (
              <button
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => openMediaPicker('avatarUrl')}
              >
                <Camera className="h-6 w-6 text-white" />
              </button>
            )}
          </div>
        )}

        {/* Name/Headline - Editable */}
        {config.showName && (
          <div
            className={cn(
              'group relative max-w-2xl',
              isEditing && isSelected && 'cursor-pointer hover:bg-white/10 rounded-md px-2 py-1 transition-colors'
            )}
            onClick={() => isEditing && isSelected && openEditor('headline', content.headline || 'Tu nombre')}
          >
            {isHtml(content.headline || '') ? (
              <SafeHtml
                html={content.headline || 'Tu nombre'}
                className="text-2xl md:text-4xl font-bold text-white"
              />
            ) : (
              <h1 className="text-2xl md:text-4xl font-bold text-white">
                {content.headline || 'Tu nombre'}
              </h1>
            )}
            {isEditing && isSelected && (
              <Pencil className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        )}

        {/* Bio/Subheadline - Editable */}
        {config.showBio && (
          <div
            className={cn(
              'group relative max-w-xl',
              isEditing && isSelected && 'cursor-pointer hover:bg-white/10 rounded-md px-2 py-1 transition-colors'
            )}
            onClick={() => isEditing && isSelected && openEditor('subheadline', content.subheadline || '')}
          >
            {content.subheadline ? (
              isHtml(content.subheadline) ? (
                <SafeHtml html={content.subheadline} className="text-base md:text-lg text-white/80" />
              ) : (
                <p className="text-base md:text-lg text-white/80">{content.subheadline}</p>
              )
            ) : (
              <span className="text-base md:text-lg text-white/40 italic">
                {isEditing ? 'Haz clic para agregar descripcion...' : 'Creador de contenido'}
              </span>
            )}
            {isEditing && isSelected && (
              <Pencil className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        )}

        {/* CTA Button */}
        {config.showCTA && (
          <div className="mt-2">
            <Button
              size="lg"
              className="bg-white text-black hover:bg-white/90 font-semibold px-8"
              onClick={handleCtaClick}
            >
              {config.ctaText || 'Contactar'}
            </Button>
          </div>
        )}
      </div>

      {/* Editor Popup */}
      <TextFormatPopup
        open={isOpen}
        onOpenChange={(open) => !open && closeEditor()}
        initialContent={editingContent}
        onSave={handleSave}
        title={editingField === 'headline' ? 'Editar nombre' : 'Editar descripcion'}
        placeholder={editingField === 'headline' ? 'Tu nombre o titulo...' : 'Una breve descripcion...'}
        mode={editingField === 'headline' ? 'inline' : 'block'}
      />

      {/* Media Library Picker */}
      {userId && (
        <MediaLibraryPicker
          open={mediaPickerOpen}
          onOpenChange={setMediaPickerOpen}
          onSelect={handleMediaSelect}
          allowedTypes={['image']}
          userId={userId}
          creatorProfileId={creatorProfileId}
        />
      )}
    </div>
  );
}

export const HeroBannerBlock = memo(HeroBannerBlockComponent);
