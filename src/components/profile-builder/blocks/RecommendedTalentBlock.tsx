import { memo, useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronLeft, ChevronRight, Crown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCreatorPlanFeatures } from '@/hooks/useCreatorPlanFeatures';
import { useMarketplaceCreators } from '@/hooks/useMarketplaceCreators';
import { MarketplaceCreatorCard } from '@/components/marketplace/CreatorCard';
import { CreatorCardSkeleton } from '@/components/marketplace/CreatorCardSkeleton';
import type { BlockProps } from '../types/profile-builder';
import { getBlockStyleObject } from './blockStyles';

interface RecommendedTalentConfig {
  maxItems: number;
  layout: 'horizontal' | 'grid';
  showRating: boolean;
  showCategory: boolean;
}

interface RecommendedTalentContent {
  title?: string;
  subtitle?: string;
  categories?: string[];
  excludeId?: string;
}

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
};

function RecommendedTalentBlockComponent({ block, isEditing, isSelected, onUpdate, creatorProfileId }: BlockProps) {
  const navigate = useNavigate();
  const config = block.config as RecommendedTalentConfig;
  const content = block.content as RecommendedTalentContent;
  const styles = block.styles;
  const { isFree, canDeleteRecommendedTalent } = useCreatorPlanFeatures();

  // Carousel scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Obtener creadores similares
  const { getSimilarCreators, isLoading } = useMarketplaceCreators();
  const excludeId = content.excludeId || creatorProfileId || '';
  const categories = content.categories || [];
  const creators = getSimilarCreators(categories, excludeId, config.maxItems || 4);

  const handleContentUpdate = (updates: Partial<RecommendedTalentContent>) => {
    onUpdate({ content: { ...content, ...updates } });
  };

  const handleCreatorClick = useCallback((id: string) => {
    navigate(`/marketplace/creator/${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate]);

  // Check scroll state
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, creators]);

  const scroll = useCallback((dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  }, []);

  // No mostrar si no hay creadores y no estamos cargando
  if (!isLoading && creators.length === 0 && !isEditing) {
    return null;
  }

  // Obtener estilos base y combinar con valores por defecto
  const baseStyle = getBlockStyleObject(styles);
  const blockStyle: React.CSSProperties = {
    backgroundColor: styles.backgroundColor || 'rgba(139, 92, 246, 0.03)',
    ...baseStyle,
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-border/30 relative',
        // Solo aplicar clase si no hay padding custom
        !styles.paddingCustom && paddingClasses[styles.padding || 'lg'],
      )}
      style={blockStyle}
    >
      {/* Badge de monetizacion Kreoon (solo visible en FREE) */}
      {isFree && (
        <div className="absolute top-3 right-3">
          <Badge
            variant="outline"
            className="text-[10px] gap-1 bg-background/80 border-purple-500/30 text-purple-400"
          >
            <Crown className="h-3 w-3" />
            Powered by Kreoon
          </Badge>
        </div>
      )}

      {/* Indicador de bloque bloqueado para FREE */}
      {isFree && isEditing && (
        <div className="absolute -top-2 -left-2 z-10">
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">
            <Lock className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] text-amber-400 font-medium">
              Upgrade para eliminar
            </span>
          </div>
        </div>
      )}

      {/* Encabezado con controles de scroll */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-amber-500/20 flex items-center justify-center">
            <Users className="h-5 w-5 text-purple-400" />
          </div>
          <div className="flex-1">
            {isEditing && isSelected ? (
              <input
                type="text"
                value={content.title || ''}
                onChange={(e) => handleContentUpdate({ title: e.target.value })}
                placeholder="Talento Similar"
                className="text-lg font-semibold text-foreground bg-transparent border-none w-full focus:outline-none focus:ring-1 focus:ring-primary rounded"
              />
            ) : (
              <h3 className="text-lg font-semibold text-foreground">
                {content.title || 'Talento Similar'}
              </h3>
            )}
            {isEditing && isSelected ? (
              <input
                type="text"
                value={content.subtitle || ''}
                onChange={(e) => handleContentUpdate({ subtitle: e.target.value })}
                placeholder="Descubre mas creadores en Kreoon"
                className="text-sm text-muted-foreground bg-transparent border-none w-full focus:outline-none focus:ring-1 focus:ring-primary rounded mt-1"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {content.subtitle || 'Descubre mas creadores en Kreoon'}
              </p>
            )}
          </div>
        </div>

        {/* Controles de navegación */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={cn(
              'w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center transition-all',
              canScrollLeft
                ? 'hover:bg-white/20 text-white'
                : 'opacity-30 cursor-not-allowed text-gray-500',
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={cn(
              'w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center transition-all',
              canScrollRight
                ? 'hover:bg-white/20 text-white'
                : 'opacity-30 cursor-not-allowed text-gray-500',
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Carrusel de creadores - formato vertical 9:16 */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
      >
        {isLoading ? (
          // Skeletons de carga
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="snap-start flex-shrink-0 w-[140px] max-sm:w-[35vw]">
              <CreatorCardSkeleton />
            </div>
          ))
        ) : creators.length > 0 ? (
          // Tarjetas de creadores reales con thumbnails de Bunny
          creators.map((creator) => (
            <div
              key={creator.id}
              className="snap-start flex-shrink-0 w-[140px] max-sm:w-[35vw]"
            >
              <MarketplaceCreatorCard
                creator={creator}
                onClick={() => handleCreatorClick(creator.slug || creator.id)}
              />
            </div>
          ))
        ) : isEditing ? (
          // Placeholder en modo edición cuando no hay creadores
          <div className="w-full py-8 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Los creadores similares aparecerán aquí</p>
          </div>
        ) : null}
      </div>

      {/* CTA Kreoon */}
      <div className="mt-4 flex items-center justify-center">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
          onClick={() => navigate('/marketplace')}
        >
          <Users className="h-4 w-4" />
          Explorar más talento
        </Button>
      </div>

      {/* Info para editor */}
      {isEditing && !canDeleteRecommendedTalent && (
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-400 text-center">
            Este bloque ayuda a otros creadores a ser descubiertos.
            Puedes moverlo pero no eliminarlo con el plan Free.
            <br />
            <span className="font-medium">Upgrade a Pro o Premium para eliminarlo.</span>
          </p>
        </div>
      )}
    </div>
  );
}

export const RecommendedTalentBlock = memo(RecommendedTalentBlockComponent);
