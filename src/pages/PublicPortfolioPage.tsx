import { useState, useEffect, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { Film, Play, RefreshCw, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getBunnyThumbnailUrl } from '@/hooks/useHLSPlayer';
import { getOptimizedThumbnail } from '@/lib/imageOptimization';
import { cn } from '@/lib/utils';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { AuthModal } from '@/components/auth/AuthModal';
import { KreoonButton } from '@/components/ui/kreoon';

interface PortfolioItem {
  id: string;
  title: string | null;
  video_url: string | null;
  bunny_embed_url: string | null;
  thumbnail_url: string | null;
  creator_name: string | null;
  creator_avatar: string | null;
}

const DEFAULT_ORG_SLUG = 'ugc-colombia';
const MAX_ITEMS = 50;
const PRELOAD_COUNT = 6;

function getThumbnail(item: PortfolioItem): string {
  const videoUrl = item.bunny_embed_url || item.video_url;
  if (item.thumbnail_url) {
    return getOptimizedThumbnail(item.thumbnail_url, 400, 711, 80);
  }
  if (videoUrl) {
    const bunnyThumb = getBunnyThumbnailUrl(videoUrl);
    if (bunnyThumb) {
      return getOptimizedThumbnail(bunnyThumb, 400, 711, 80);
    }
  }
  return '/placeholder-video.jpg';
}

const VideoCard = memo(function VideoCard({ item }: { item: PortfolioItem }) {
  const thumb = getThumbnail(item);

  return (
    <div className="group relative rounded-sm overflow-hidden bg-kreoon-bg-tertiary cursor-pointer hover:ring-2 hover:ring-kreoon-purple-500/50 transition-all duration-300">
      <div className="relative aspect-[9/16]">
        <img
          src={thumb}
          alt={item.title || 'Proyecto'}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 rounded-full p-4 bg-kreoon-purple-500/80">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
      </div>
    </div>
  );
});

export default function PublicPortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [authModal, setAuthModal] = useState<{
    open: boolean;
    tab: 'login' | 'register';
  }>({ open: false, tab: 'login' });

  const handleOpenAuth = (tab: 'login' | 'register') => {
    setAuthModal({ open: true, tab });
  };

  const fetchContent = useCallback(async () => {
    setRotating(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_public_org_content_page', {
        org_slug: DEFAULT_ORG_SLUG,
        max_items: MAX_ITEMS,
      });

      console.log('[PublicPortfolioPage] RPC response:', { data, error });

      if (error) {
        console.error('[PublicPortfolioPage] Error:', error);
        return;
      }

      // El RPC devuelve JSONB con estructura { org, stats, content }
      const content = (data?.content || []) as PortfolioItem[];
      console.log('[PublicPortfolioPage] Content count:', content.length);
      setItems(content);
    } catch (err) {
      console.error('[PublicPortfolioPage] Error:', err);
    } finally {
      setLoading(false);
      setRotating(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Preload primeros thumbnails para LCP
  useEffect(() => {
    if (!items.length) return;

    items.slice(0, PRELOAD_COUNT).forEach((item, i) => {
      const thumbUrl = getThumbnail(item);
      if (!thumbUrl || thumbUrl.includes('placeholder')) return;

      const existing = document.querySelector(`link[href="${CSS.escape(thumbUrl)}"]`);
      if (existing) return;

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = thumbUrl;
      if (i < 2) link.setAttribute('fetchpriority', 'high');
      document.head.appendChild(link);
    });
  }, [items]);

  return (
    <>
      <LandingLayout onOpenAuth={handleOpenAuth}>
        {/* Hero Section */}
        <section className="pt-16 pb-12 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-kreoon-purple-500/10 text-kreoon-purple-400 text-sm font-medium mb-6">
              Proyectos Reales
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
              Portafolio de Contenido Aprobado
            </h1>
            <p className="text-lg md:text-xl text-kreoon-text-secondary max-w-2xl mx-auto mb-8">
              Explora proyectos reales creados por nuestra comunidad de creadores.
              Contenido que ha sido aprobado y entregado a marcas reales.
            </p>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-kreoon-bg-tertiary border border-kreoon-border">
                <Film className="h-4 w-4 text-kreoon-purple-400" />
                <span className="text-sm font-medium text-white">{items.length} proyectos</span>
              </div>
              <KreoonButton
                variant="secondary"
                onClick={fetchContent}
                disabled={rotating}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", rotating && "animate-spin")} />
                Rotar contenido
              </KreoonButton>
            </div>
          </div>
        </section>

        {/* Content Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-[9/16] rounded-sm bg-kreoon-bg-tertiary animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-24">
              <Film className="h-16 w-16 mx-auto text-kreoon-text-muted mb-4" />
              <p className="text-kreoon-text-secondary text-lg mb-2">No hay contenido disponible en este momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {items.map((item) => (
                <VideoCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="border-t border-kreoon-border py-16 bg-kreoon-bg-secondary">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <Users className="h-12 w-12 mx-auto text-kreoon-purple-400 mb-6" />
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              ¿Quieres que tu contenido aparezca aquí?
            </h2>
            <p className="text-kreoon-text-secondary mb-8">
              Únete a nuestra comunidad de creadores y trabaja con marcas reales.
            </p>
            <KreoonButton
              variant="primary"
              size="lg"
              onClick={() => handleOpenAuth('register')}
            >
              Comenzar como Creador
            </KreoonButton>
          </div>
        </section>
      </LandingLayout>

      <AuthModal
        open={authModal.open}
        onClose={() => setAuthModal((prev) => ({ ...prev, open: false }))}
        initialTab={authModal.tab}
      />
    </>
  );
}
