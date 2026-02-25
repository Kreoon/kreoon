import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, Loader2, ExternalLink, Play, Eye, Heart, Volume2, VolumeX, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { BunnyVideoPlayer } from '@/components/video/BunnyVideoPlayer';
import { getBunnyThumbnailUrl } from '@/hooks/useHLSPlayer';

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  portfolio_title: string | null;
  portfolio_description: string | null;
  portfolio_cover: string | null;
  portfolio_color: string | null;
  primary_color: string | null;
}

interface PublicContent {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  bunny_embed_url: string | null;
  thumbnail_url: string | null;
  status: string;
  views_count: number;
  likes_count: number;
  approved_at: string;
  created_at: string;
  sphere_phase: string | null;
  creator_name: string | null;
  creator_avatar: string | null;
}

const PHASE_LABELS: Record<string, string> = {
  engage: 'Engage',
  solution: 'Solution',
  remarketing: 'Remarketing',
  fidelize: 'Fidelizar',
};

const PHASE_COLORS: Record<string, string> = {
  engage: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  solution: 'bg-green-500/20 text-green-400 border-green-500/30',
  remarketing: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  fidelize: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

function getVideoSrc(item: PublicContent): string | null {
  return item.video_url || item.bunny_embed_url || null;
}

function getThumbnail(item: PublicContent): string | null {
  if (item.thumbnail_url) return item.thumbnail_url;
  const src = getVideoSrc(item);
  if (src) return getBunnyThumbnailUrl(src);
  return null;
}

// ── Video thumbnail card (lazy loaded, lightweight) ──
const VideoCard = memo(function VideoCard({
  item,
  onClick,
}: {
  item: PublicContent;
  onClick: () => void;
}) {
  const thumb = getThumbnail(item);
  const initials = item.creator_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '';

  return (
    <div
      className="group relative rounded-xl overflow-hidden bg-card border border-border/50 cursor-pointer hover:border-border hover:shadow-lg transition-all duration-200"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] bg-muted/30">
        {thumb ? (
          <img
            src={thumb}
            alt={item.title || 'Video'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/60 rounded-full p-3 backdrop-blur-sm">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>

        {/* Phase badge */}
        {item.sphere_phase && PHASE_LABELS[item.sphere_phase] && (
          <div className="absolute top-2 left-2">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${PHASE_COLORS[item.sphere_phase] || 'bg-muted text-muted-foreground'}`}>
              {PHASE_LABELS[item.sphere_phase]}
            </span>
          </div>
        )}

        {/* Stats overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-8">
          <div className="flex items-center gap-3 text-white/80 text-[11px]">
            {item.views_count > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {formatNumber(item.views_count)}
              </span>
            )}
            {item.likes_count > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" /> {formatNumber(item.likes_count)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
          {item.title || 'Sin título'}
        </p>
        {item.creator_name && (
          <div className="flex items-center gap-1.5 mt-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={item.creator_avatar || ''} alt={item.creator_name} />
              <AvatarFallback className="text-[8px] bg-muted">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">{item.creator_name}</span>
          </div>
        )}
      </div>
    </div>
  );
});

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ── Main page ──
export default function OrgContentShowcase() {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [content, setContent] = useState<PublicContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PublicContent | null>(null);
  const [filterPhase, setFilterPhase] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      // Fetch org info via existing public RPC
      const { data: orgData, error: orgError } = await (supabase as any)
        .rpc('get_public_org_portfolio', { org_slug: slug });

      if (orgError || !orgData || orgData.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const orgInfo = orgData[0] as OrgInfo;
      setOrg(orgInfo);

      // Fetch approved content
      const { data: contentData, error: contentError } = await (supabase as any)
        .rpc('get_public_org_content', { org_slug: slug, max_items: 50 });

      if (!contentError && contentData) {
        setContent(contentData as PublicContent[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [slug]);

  // SEO title
  useEffect(() => {
    if (org) {
      document.title = `${org.portfolio_title || org.name} - Contenido | KREOON`;
    }
    return () => { document.title = 'KREOON'; };
  }, [org]);

  // Phases present in content
  const availablePhases = [...new Set(content.map((c) => c.sphere_phase).filter(Boolean))] as string[];

  const filteredContent = filterPhase
    ? content.filter((c) => c.sphere_phase === filterPhase)
    : content;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !org) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground/40" />
          <h1 className="text-xl font-semibold text-foreground">Contenido no disponible</h1>
          <p className="text-muted-foreground">Esta organizacion no tiene un portafolio de contenido publico.</p>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            Ir al inicio
          </Button>
        </div>
      </div>
    );
  }

  const accentColor = org.portfolio_color || org.primary_color || '#8B5CF6';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          {org.logo_url ? (
            <img
              src={org.logo_url}
              alt={org.name}
              className="h-9 w-9 rounded-lg object-cover border border-border/50"
            />
          ) : (
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center border border-border/50"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Building2 className="h-4 w-4" style={{ color: accentColor }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">
              {org.portfolio_title || org.name}
            </h1>
            <p className="text-xs text-muted-foreground">Contenido aprobado</p>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">
            <Film className="h-3 w-3 mr-1" />
            {content.length} videos
          </Badge>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden">
        {org.portfolio_cover ? (
          <div className="h-48 md:h-56">
            <img src={org.portfolio_cover} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-background" />
          </div>
        ) : (
          <div
            className="h-48 md:h-56"
            style={{
              background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05, hsl(var(--background)))`,
            }}
          />
        )}
        <div className="absolute bottom-0 inset-x-0 p-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              {org.portfolio_title || org.name}
            </h2>
            {org.portfolio_description && (
              <p className="text-muted-foreground mt-1 max-w-2xl line-clamp-2">
                {org.portfolio_description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Phase filters */}
      {availablePhases.length > 1 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterPhase(null)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
              !filterPhase
                ? 'bg-foreground text-background border-foreground'
                : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30'
            }`}
          >
            Todo ({content.length})
          </button>
          {availablePhases.map((phase) => {
            const count = content.filter((c) => c.sphere_phase === phase).length;
            return (
              <button
                key={phase}
                onClick={() => setFilterPhase(phase === filterPhase ? null : phase)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                  filterPhase === phase
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30'
                }`}
              >
                {PHASE_LABELS[phase] || phase} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Content grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {filteredContent.length === 0 ? (
          <div className="text-center py-20">
            <Film className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {filterPhase ? 'No hay contenido en esta fase.' : 'No hay contenido disponible.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredContent.map((item) => (
              <VideoCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground/60 text-sm">
            <img src="/favicon.png" alt="KREOON" className="h-5 w-5 rounded" />
            <span>Powered by KREOON</span>
          </div>
          <a
            href="/"
            className="text-sm text-muted-foreground/60 hover:text-foreground flex items-center gap-1 transition-colors"
          >
            kreoon.com <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </footer>

      {/* Video lightbox */}
      {selectedItem && (
        <VideoLightbox
          item={selectedItem}
          accentColor={accentColor}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

// ── Video lightbox dialog ──
function VideoLightbox({
  item,
  accentColor,
  onClose,
}: {
  item: PublicContent;
  accentColor: string;
  onClose: () => void;
}) {
  const videoSrc = getVideoSrc(item);
  const initials = item.creator_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '';

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-card border-border gap-0">
        <DialogTitle className="sr-only">{item.title || 'Video'}</DialogTitle>

        {/* Video */}
        <div className="relative bg-black aspect-[9/16] max-h-[70vh]">
          {videoSrc ? (
            <BunnyVideoPlayer
              src={videoSrc}
              poster={getThumbnail(item) || undefined}
              autoPlay
              muted={false}
              loop
              showControls
              showMuteButton
              objectFit="contain"
              aspectRatio="auto"
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Film className="h-10 w-10" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-foreground line-clamp-2">
            {item.title || 'Sin titulo'}
          </h3>

          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>
          )}

          <div className="flex items-center justify-between">
            {item.creator_name && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={item.creator_avatar || ''} alt={item.creator_name} />
                  <AvatarFallback className="text-[9px] bg-muted">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">{item.creator_name}</span>
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {item.views_count > 0 && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {formatNumber(item.views_count)}
                </span>
              )}
              {item.likes_count > 0 && (
                <span className="flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" /> {formatNumber(item.likes_count)}
                </span>
              )}
              {item.sphere_phase && PHASE_LABELS[item.sphere_phase] && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${PHASE_COLORS[item.sphere_phase] || ''}`}>
                  {PHASE_LABELS[item.sphere_phase]}
                </span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
