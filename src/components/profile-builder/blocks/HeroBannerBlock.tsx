import { memo, useState } from 'react';
import { Camera, Pencil } from 'lucide-react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { BlockProps } from '../types/profile-builder';
import { TextFormatPopup, useTextFormatPopup } from '../TextFormatPopup';
import { MediaLibraryPicker } from '../media/MediaLibraryPicker';
import type { MediaItem } from '../media/types';
import { getBlockStyleObject } from './blockStyles';

// Ajusta un color hex haciéndolo más claro o más oscuro
function adjustColor(hex: string, amount: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, val));
  const color = hex.replace('#', '');
  const r = clamp(parseInt(color.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(color.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(color.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Traducciones de tiers (niveles)
const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  diamond: 'Diamante',
  platinum: 'Platino',
  starter: 'Inicial',
  free: 'Gratis',
  pro: 'Pro',
  premium: 'Premium',
  creator_free: 'Creador',
  creator_pro: 'Creador Pro',
  creator_premium: 'Creador Premium',
};

// Traducciones de categorías
const CATEGORY_LABELS: Record<string, string> = {
  content_creation: 'Creación de Contenido',
  ugc: 'UGC Creator',
  ugc_creator: 'UGC Creator',
  influencer: 'Influencer',
  video_production: 'Producción de Video',
  photography: 'Fotografía',
  graphic_design: 'Diseño Gráfico',
  copywriting: 'Copywriting',
  social_media: 'Redes Sociales',
  marketing: 'Marketing Digital',
  branding: 'Branding',
  animation: 'Animación',
  podcast: 'Podcast',
  streaming: 'Streaming',
  music: 'Música',
  voice_over: 'Locución',
  editing: 'Edición',
  other: 'Otro',
};

// Formatea el badge de tier/categoría en español
function formatBadgeLabel(rawValue: string): string {
  if (!rawValue) return '';

  // Si tiene formato "tier - category" o "tier_category"
  const parts = rawValue.includes(' - ')
    ? rawValue.split(' - ')
    : rawValue.includes('_') && rawValue.split('_').length > 2
    ? [rawValue.split('_')[0], rawValue.split('_').slice(1).join('_')]
    : [rawValue];

  const translatedParts = parts.map(part => {
    const key = part.trim().toLowerCase();
    return TIER_LABELS[key] || CATEGORY_LABELS[key] || part;
  });

  return translatedParts.join(' · ');
}

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
  // Fondo
  backgroundType: 'color' | 'gradient' | 'image';
  backgroundColor?: string;
  backgroundOpacity?: number;
  // Layout
  layout: 'horizontal' | 'vertical' | 'centered';
  avatarPosition: 'left' | 'right' | 'top';
  avatarSize: 'sm' | 'md' | 'lg' | 'xl';
  avatarShape: 'square' | 'rounded' | 'circle';
  contentAlign: 'left' | 'center' | 'right';
  // Contenido (avatar y nombre siempre visibles)
  showRole: boolean;
  showTagline: boolean;
  showCTA: boolean;
  showSocialLinks: boolean;
  // CTA
  ctaText: string;
  ctaAction?: 'scroll-portfolio' | 'contact' | 'link' | 'whatsapp';
  ctaUrl?: string;
  ctaWhatsapp?: string;
  ctaWhatsappMessage?: string;
  ctaStyle?: 'solid' | 'outline' | 'ghost';
  // Premium
  premiumCtaEnabled?: boolean;
  // Espaciado
  minHeight?: 'auto' | 'sm' | 'md' | 'lg' | 'full';
}

interface HeroBannerContent {
  headline?: string;
  subheadline?: string;
  role?: string;
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
    const action = config.ctaAction || 'scroll-portfolio';

    switch (action) {
      case 'scroll-portfolio':
        const portfolioSection = document.querySelector('[data-block-type="portfolio"]');
        if (portfolioSection) {
          portfolioSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        break;
      case 'contact':
        const contactSection = document.querySelector('[data-block-type="contact"]');
        if (contactSection) {
          contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        break;
      case 'link':
        if (config.premiumCtaEnabled && config.ctaUrl) {
          window.open(config.ctaUrl, '_blank');
        }
        break;
      case 'whatsapp':
        if (config.premiumCtaEnabled && config.ctaWhatsapp) {
          const message = encodeURIComponent(config.ctaWhatsappMessage || 'Hola! Vi tu perfil en Kreoon');
          const url = `https://wa.me/${config.ctaWhatsapp}?text=${message}`;
          window.open(url, '_blank');
        }
        break;
    }
  };

  const handleMediaSelect = (media: MediaItem) => {
    if (mediaPickerTarget) {
      handleContentUpdate({ [mediaPickerTarget]: media.url });
    }
    setMediaPickerOpen(false);
    setMediaPickerTarget(null);
  };

  // Configuracion con defaults - Fondo desde styles (Avanzado)
  const bgOpacity = (styles.backgroundOpacity ?? 100) / 100;
  const bgType = styles.backgroundType || 'color';
  const bgColor = styles.backgroundColor || '#1a1a2e';
  const bgImage = styles.backgroundImage;
  const bgPosition = styles.backgroundPosition || 'center';
  const bgSize = styles.backgroundSize || 'cover';
  // Overlay
  const overlayStyle = styles.backgroundOverlayStyle || 'gradient-bottom';
  const overlayIntensity = (styles.backgroundOverlayIntensity ?? 50) / 100;
  const overlayColor = styles.backgroundOverlay || '#000000';

  // Genera el CSS del overlay según el estilo
  const getOverlayBackground = () => {
    if (overlayStyle === 'none') return 'transparent';

    // Extraer RGB del color (soporta hex y rgba)
    let r = 0, g = 0, b = 0;
    if (overlayColor.startsWith('#')) {
      const hex = overlayColor.replace('#', '');
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else if (overlayColor.startsWith('rgb')) {
      const match = overlayColor.match(/\d+/g);
      if (match) {
        r = parseInt(match[0]);
        g = parseInt(match[1]);
        b = parseInt(match[2]);
      }
    }

    const solid = `rgba(${r}, ${g}, ${b}, ${overlayIntensity})`;
    const transparent = `rgba(${r}, ${g}, ${b}, 0)`;

    switch (overlayStyle) {
      case 'full':
        return solid;
      case 'gradient-bottom':
        return `linear-gradient(to top, ${solid} 0%, ${solid} 20%, ${transparent} 80%)`;
      case 'gradient-top':
        return `linear-gradient(to bottom, ${solid} 0%, ${solid} 20%, ${transparent} 80%)`;
      case 'gradient-center':
        return `radial-gradient(ellipse at center, ${transparent} 0%, ${solid} 100%)`;
      default:
        return solid;
    }
  };
  // Layout desde config (Contenido)
  const layout = config.layout || 'horizontal';
  const avatarPosition = config.avatarPosition || 'left';
  const avatarSize = config.avatarSize || 'lg';
  const avatarShape = config.avatarShape || 'rounded';
  const contentAlign = config.contentAlign || 'left';
  const minHeight = config.minHeight || 'md';

  // Clases de tamaño de avatar
  const avatarSizeClasses = {
    sm: 'w-20 h-20 md:w-24 md:h-24',
    md: 'w-28 h-28 md:w-32 md:h-32',
    lg: 'w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48',
    xl: 'w-40 h-40 md:w-52 md:h-52 lg:w-60 lg:h-60',
  };

  // Clases de forma de avatar
  const avatarShapeClasses = {
    square: 'rounded-md',
    rounded: 'rounded-xl',
    circle: 'rounded-full',
  };

  // Clases de altura minima
  const minHeightClasses = {
    auto: 'min-h-[200px]',
    sm: 'min-h-[280px] md:min-h-[320px]',
    md: 'min-h-[320px] md:min-h-[400px]',
    lg: 'min-h-[400px] md:min-h-[500px]',
    full: 'min-h-[500px] md:min-h-[600px]',
  };

  // Clases de alineacion de contenido
  const alignClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };

  // Generar estilos de fondo inline
  const getBackgroundStyle = (): React.CSSProperties => {
    if (bgType === 'image' && bgImage) {
      return {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: bgSize,
        backgroundPosition: bgPosition,
        backgroundRepeat: 'no-repeat',
      };
    }
    if (bgType === 'gradient') {
      return {
        background: styles.gradientStops
          ? `linear-gradient(${styles.gradientAngle || 135}deg, ${styles.gradientStops.map(s => `${s.color} ${s.position}%`).join(', ')})`
          : `linear-gradient(135deg, ${bgColor} 0%, ${adjustColor(bgColor, 40)} 100%)`,
        opacity: bgOpacity,
      };
    }
    return {
      backgroundColor: bgColor,
      opacity: bgOpacity,
    };
  };

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden',
        minHeightClasses[minHeight],
      )}
      style={{
        ...getBlockStyleObject(styles),
        ...getBackgroundStyle(),
      }}
    >
      {/* Overlay - solo para imágenes */}
      {bgType === 'image' && bgImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: getOverlayBackground() }}
        />
      )}

      {/* Content container */}
      <div
        className={cn(
          'relative z-10 flex gap-6 md:gap-10 p-6 md:p-10 h-full',
          minHeightClasses[minHeight],
          // Layout horizontal
          layout === 'horizontal' && 'flex-col md:flex-row md:items-center',
          layout === 'horizontal' && avatarPosition === 'right' && 'md:flex-row-reverse',
          // Layout vertical
          layout === 'vertical' && 'flex-col items-center',
          // Layout centrado
          layout === 'centered' && 'flex-col items-center justify-center',
        )}
      >
        {/* Avatar - SIEMPRE VISIBLE */}
        <div
          className={cn(
            'flex-shrink-0',
            layout === 'horizontal' && 'flex justify-center md:justify-start',
            (layout === 'vertical' || layout === 'centered') && 'flex justify-center',
          )}
        >
          <div className="relative group">
            {content.avatarUrl ? (
              <img
                src={content.avatarUrl}
                alt=""
                className={cn(
                  avatarSizeClasses[avatarSize],
                  avatarShapeClasses[avatarShape],
                  'object-cover border-4 border-white/10 shadow-2xl'
                )}
                loading="eager"
                decoding="async"
              />
            ) : (
              <div
                className={cn(
                  avatarSizeClasses[avatarSize],
                  avatarShapeClasses[avatarShape],
                  'bg-white/10 flex items-center justify-center border-4 border-white/10'
                )}
              >
                <span className="text-4xl md:text-5xl text-white/40">?</span>
              </div>
            )}
            {isEditing && isSelected && userId && (
              <button
                className={cn(
                  'absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity',
                  avatarShapeClasses[avatarShape]
                )}
                onClick={() => openMediaPicker('avatarUrl')}
              >
                <Camera className="h-6 w-6 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Info - Nombre SIEMPRE VISIBLE */}
        <div
          className={cn(
            'flex flex-col gap-3 flex-1',
            alignClasses[contentAlign],
            layout === 'centered' && 'items-center text-center',
          )}
        >
          {/* Role badge - NO editable, viene del sistema (traducido a español) */}
          {config.showRole && content.role && (
            <div className="w-fit mx-auto md:mx-0">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-300 text-sm font-medium backdrop-blur-sm border border-purple-500/20">
                {formatBadgeLabel(content.role)}
              </span>
            </div>
          )}

          {/* Name/Headline - SIEMPRE VISIBLE (obligatorio) */}
          <div
            className={cn(
              'group relative',
              isEditing && isSelected && 'cursor-pointer hover:bg-white/5 rounded-md px-2 py-1 -mx-2 transition-colors'
            )}
            onClick={() => isEditing && isSelected && openEditor('headline', content.headline || 'Tu nombre')}
          >
            {isHtml(content.headline || '') ? (
              <SafeHtml
                html={content.headline || 'Tu nombre'}
                className="text-2xl md:text-4xl lg:text-5xl font-bold text-white"
              />
            ) : (
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white">
                {content.headline || 'Tu nombre'}
              </h1>
            )}
            {isEditing && isSelected && (
              <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>

          {/* Tagline/Subheadline - Editable */}
          {config.showTagline && (
            <div
              className={cn(
                'group relative max-w-xl',
                isEditing && isSelected && 'cursor-pointer hover:bg-white/5 rounded-md px-2 py-1 -mx-2 transition-colors'
              )}
              onClick={() => isEditing && isSelected && openEditor('subheadline', content.subheadline || '')}
            >
              {content.subheadline ? (
                isHtml(content.subheadline) ? (
                  <SafeHtml html={content.subheadline} className="text-base md:text-lg lg:text-xl text-white/70" />
                ) : (
                  <p className="text-base md:text-lg lg:text-xl text-white/70">{content.subheadline}</p>
                )
              ) : (
                <span className="text-base md:text-lg text-white/40 italic">
                  {isEditing ? 'Haz clic para agregar tu tagline...' : 'Transformo ideas en contenido que conecta'}
                </span>
              )}
              {isEditing && isSelected && (
                <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          )}

          {/* CTA Button */}
          {config.showCTA && (
            <div className="mt-4 flex justify-center md:justify-start">
              <Button
                size="lg"
                className="bg-white text-zinc-900 hover:bg-white/90 font-semibold px-8 shadow-lg"
                onClick={handleCtaClick}
              >
                {config.ctaText || 'Ver Portfolio'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Editor Popup - Solo para nombre y tagline */}
      <TextFormatPopup
        open={isOpen}
        onOpenChange={(open) => !open && closeEditor()}
        initialContent={editingContent}
        onSave={handleSave}
        title={editingField === 'headline' ? 'Editar nombre' : 'Editar tagline'}
        placeholder={
          editingField === 'headline'
            ? 'Tu nombre o titulo...'
            : 'Una breve descripcion de lo que haces...'
        }
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
