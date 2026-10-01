/**
 * Portafolio público «Estudio UGC» (propuesta docs/hermes/enlace-profesional, aprobada 2026-10-01).
 *
 * Una sola composición para todos los creadores, con la marca de la landing (marfil + morado):
 *   1. Portada: especialidad · nombre · frase · [Hablemos de tu marca] [Ver mis trabajos] + video 9:16 y foto
 *   2. Trabajos destacados: videos 9:16 (carátula primero; el reproductor se carga al tocar)
 *   3. Lo que hago: servicios con precio o «A convenir»
 *   4. Un poco sobre mí
 *   5. Reseñas: solo si existen
 *   6. ¿Trabajamos juntos?: cierre con contacto
 * Las secciones sin datos reales no se muestran.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Star, BadgeCheck, MapPin, Clock, Instagram, Youtube, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getOptimizedImageUrl, getOptimizedThumbnail } from '@/lib/imageOptimization';
import { BunnyStreamPlayer, isBunnyUrl } from '@/components/profile-builder/blocks/BunnyStreamPlayer';
import { cn } from '@/lib/utils';
import type { CreatorPublicProfile } from '@/hooks/useCreatorPublicProfile';

type PortfolioItem = CreatorPublicProfile['portfolioItems'][number];
type Service = CreatorPublicProfile['services'][number];

const MAX_WORKS = 8;

const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  twitter: 'X',
  x: 'X',
  website: 'Sitio web',
  web: 'Sitio web',
};

function socialIcon(key: string) {
  if (key === 'instagram') return <Instagram className="h-4 w-4" aria-hidden="true" />;
  if (key === 'youtube') return <Youtube className="h-4 w-4" aria-hidden="true" />;
  return <Globe className="h-4 w-4" aria-hidden="true" />;
}

function toExternalUrl(key: string, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '');
  if (key === 'instagram') return `https://instagram.com/${handle}`;
  if (key === 'tiktok') return `https://tiktok.com/@${handle}`;
  if (key === 'youtube') return `https://youtube.com/@${handle}`;
  if (key === 'twitter' || key === 'x') return `https://x.com/${handle}`;
  if (v.includes('.')) return `https://${v}`;
  return null;
}

function formatPrice(service: Service): string {
  if (service.price_type === 'custom' || !service.price_amount || service.price_amount <= 0) return 'A convenir';
  const amount = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(service.price_amount);
  const prefix = service.price_type === 'starting' ? 'Desde ' : '';
  const suffix = service.price_type === 'hourly' ? ' / hora' : '';
  return `${prefix}${amount} ${service.price_currency || 'USD'}${suffix}`;
}

// Solo precio fijo se paga directo; «desde», por hora o a convenir piden cotización
function isPayable(service: Service): boolean {
  return service.price_type === 'fixed' && !!service.price_amount && service.price_amount > 0;
}

// Títulos que en realidad son nombres de archivo (UUID, IMG_1120, video.mp4) no se muestran
function cleanTitle(title: string | null | undefined): string | null {
  const t = (title || '').trim();
  if (!t) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(t)) return null;
  if (/^(img|vid|mov|dsc|pxl|video)[_-]?\d+/i.test(t)) return null;
  if (/\.(mp4|mov|webm|jpe?g|png|heic)$/i.test(t)) return null;
  return t;
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Video vertical con carátula ─────────────────────────────────────────────

function VerticalVideo({
  item,
  className,
  large = false,
  onPlay,
}: {
  item: Pick<PortfolioItem, 'media_url' | 'thumbnail_url' | 'title' | 'media_type'>;
  className?: string;
  large?: boolean;
  onPlay?: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isVideo = item.media_type === 'video' && !!item.media_url;
  const thumb = item.thumbnail_url || (!isVideo ? item.media_url : null);
  const width = large ? 640 : 400;

  return (
    <div className={cn('relative aspect-[9/16] overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-border', className)}>
      {isVideo && playing ? (
        isBunnyUrl(item.media_url) ? (
          <BunnyStreamPlayer
            videoUrl={item.media_url}
            autoplay
            aspectRatio="9:16"
            className="absolute inset-0 h-full w-full"
            borderRadius="none"
          />
        ) : (
          <video src={item.media_url} controls autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
        )
      ) : (
        <button
          type="button"
          disabled={!isVideo}
          onClick={() => { setPlaying(true); onPlay?.(); }}
          className="group absolute inset-0 flex h-full w-full items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:cursor-default"
          aria-label={isVideo ? `Reproducir ${item.title || 'video'}` : item.title || 'Imagen del portafolio'}
        >
          {thumb && !imgError ? (
            <img
              src={isVideo ? getOptimizedThumbnail(thumb, width) : getOptimizedImageUrl(thumb, { width })}
              alt=""
              loading={large ? 'eager' : 'lazy'}
              decoding="async"
              onError={() => setImgError(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <span className="absolute inset-0 bg-gradient-to-b from-primary/10 to-primary/25" />
          )}
          {isVideo && (
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg transition-transform group-hover:scale-110 motion-reduce:transition-none">
              <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden="true" />
            </span>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

export function StudioUgcProfile({ data }: { data: CreatorPublicProfile }) {
  const { profile, portfolioItems, services, reviews, trustStats } = data;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [hiringId, setHiringId] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [heroPlaying, setHeroPlaying] = useState(false);

  const works = useMemo(() => {
    const visible = portfolioItems.filter((i) => i.is_public !== false && (i.media_url || i.thumbnail_url));
    return [...visible].sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.display_order - b.display_order);
  }, [portfolioItems]);

  // Video de portada: el reel si existe; si no, el primer trabajo en video
  const heroVideo = useMemo(() => {
    if (profile.showreel_url) {
      return { media_url: profile.showreel_url, thumbnail_url: profile.showreel_thumbnail, title: 'Video destacado', media_type: 'video' as const };
    }
    return works.find((w) => w.media_type === 'video') ?? works[0] ?? null;
  }, [profile.showreel_url, profile.showreel_thumbnail, works]);

  const featuredWorks = works.filter((w) => w !== heroVideo).slice(0, MAX_WORKS);
  const activeServices = services.filter((s) => s.is_active !== false);
  const specialty = profile.categories?.[0] || profile.content_types?.[0] || 'Creador de contenido UGC';
  const tagline = profile.bio?.trim() || '';
  const about = (profile.bio_full || '').trim();
  const location = [profile.location_city, profile.location_country].filter(Boolean).join(', ');
  const firstName = profile.display_name.split(' ')[0] || profile.display_name;

  const socials = Object.entries(profile.social_links || {})
    .map(([key, value]) => ({ key, url: toExternalUrl(key.toLowerCase(), String(value || '')) }))
    .filter((s): s is { key: string; url: string } => !!s.url);

  const completed = trustStats?.completed_projects ?? profile.completed_projects;
  const ratingCount = trustStats?.rating_count ?? profile.rating_count;
  const ratingAvg = trustStats?.rating_avg ?? profile.rating_avg;

  const handleHire = async (service: Service) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!isPayable(service)) {
      scrollToId('trabajamos-juntos');
      return;
    }
    setHiringId(service.id);
    try {
      const { data: res, error } = await supabase.functions.invoke('stripe-creator-hire', {
        body: {
          creator_id: profile.user_id,
          title: service.title,
          price: service.price_amount,
          currency: service.price_currency,
          description: service.description ?? undefined,
        },
      });
      if (error) throw new Error(error.message);
      if (res?.error) throw new Error(res.error);
      if (!res?.url) throw new Error('No se recibió el enlace de pago');
      window.location.href = res.url;
    } catch (err) {
      toast({
        title: 'No pudimos abrir el pago',
        description: err instanceof Error ? err.message : 'Inténtalo otra vez.',
        variant: 'destructive',
      });
      setHiringId(null);
    }
  };

  return (
    <main className="bg-background text-foreground" aria-label={`Portafolio de ${profile.display_name}`}>
      {/* 1. Portada */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-6 md:grid-cols-2 md:px-6 md:pt-14">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {specialty}
          </span>
          <h1 className="mt-4 flex flex-wrap items-center gap-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            {profile.display_name}
            {profile.is_verified && <BadgeCheck className="h-7 w-7 text-primary" aria-label="Perfil verificado" />}
          </h1>
          {tagline && <p className="mt-3 max-w-lg text-base leading-relaxed sm:mt-4 sm:text-lg text-muted-foreground">{tagline}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" aria-hidden="true" /> {location}
              </span>
            )}
            {completed > 0 && <span>{completed} {completed === 1 ? 'proyecto entregado' : 'proyectos entregados'}</span>}
            {ratingCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" /> {ratingAvg.toFixed(1)} ({ratingCount})
              </span>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-7 sm:flex sm:flex-wrap sm:gap-3">
            <Button className="h-11 rounded-full px-3 text-sm sm:h-12 sm:px-6 sm:text-base" onClick={() => scrollToId('trabajamos-juntos')}>
              Hablemos de tu marca
            </Button>
            {works.length > 0 && (
              <Button variant="outline" className="h-11 rounded-full border-primary/40 px-3 text-sm sm:h-12 sm:px-6 sm:text-base text-primary hover:bg-primary/5 hover:text-primary" onClick={() => scrollToId('trabajos')}>
                Ver mis trabajos
              </Button>
            )}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[17rem] sm:max-w-[22rem]">
          {heroVideo ? (
            <VerticalVideo item={{ ...heroVideo, title: cleanTitle(heroVideo.title) }} large onPlay={() => setHeroPlaying(true)} className="w-[78%]" />
          ) : (
            <div className="aspect-[9/16] w-[78%] rounded-2xl bg-gradient-to-b from-primary/10 to-primary/25" />
          )}
          {profile.avatar_url && !heroPlaying && (
            <img
              src={getOptimizedImageUrl(profile.avatar_url, { width: 320 })}
              alt={`Foto de ${profile.display_name}`}
              className="absolute bottom-6 right-0 aspect-[4/5] w-[42%] rounded-2xl object-cover shadow-xl ring-4 ring-background"
            />
          )}
        </div>
      </section>

      {/* 2. Trabajos destacados */}
      {featuredWorks.length > 0 && (
        <section id="trabajos" className="scroll-mt-20 bg-card py-14">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className="text-2xl font-bold md:text-3xl">Trabajos destacados</h2>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {featuredWorks.map((item) => {
                const title = cleanTitle(item.title);
                return (
                <figure key={item.id}>
                  <VerticalVideo item={{ ...item, title }} />
                  {(title || item.brand_name || item.category) && (
                    <figcaption className="mt-2 px-1">
                      {title && <p className="line-clamp-1 text-sm font-semibold">{title}</p>}
                      {(item.brand_name || item.category) && (
                        <p className="line-clamp-1 text-xs text-muted-foreground">{item.brand_name || item.category}</p>
                      )}
                    </figcaption>
                  )}
                </figure>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 3. Lo que hago */}
      {activeServices.length > 0 && (
        <section id="servicios" className="scroll-mt-20 py-14">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className="text-2xl font-bold md:text-3xl">Lo que hago</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {activeServices.slice(0, 6).map((service) => (
                <article key={service.id} className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h3 className="text-lg font-semibold">{service.title}</h3>
                  {service.description && (
                    <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{service.description}</p>
                  )}
                  <div className="mt-auto pt-5">
                    <p className="text-xl font-bold text-primary">{formatPrice(service)}</p>
                    {service.delivery_days ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Entrega en {service.delivery_days} {service.delivery_days === 1 ? 'día' : 'días'}
                      </p>
                    ) : null}
                    <Button
                      className="mt-4 h-11 w-full rounded-full"
                      variant={isPayable(service) ? 'default' : 'outline'}
                      disabled={hiringId === service.id}
                      onClick={() => handleHire(service)}
                    >
                      {hiringId === service.id ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Abriendo el pago…</>
                      ) : isPayable(service) ? (
                        'Contratar'
                      ) : (
                        'Pedir cotización'
                      )}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Un poco sobre mí */}
      {(about || (tagline && !about)) && (
        <section className="py-14">
          <div className="mx-auto max-w-3xl px-4 md:px-6">
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:flex-row sm:text-left md:p-8">
              {profile.avatar_url && (
                <img
                  src={getOptimizedImageUrl(profile.avatar_url, { width: 192 })}
                  alt=""
                  loading="lazy"
                  className="h-24 w-24 shrink-0 rounded-full object-cover"
                />
              )}
              <div>
                <h2 className="text-xl font-bold">Un poco sobre mí</h2>
                <p className={cn('mt-2 whitespace-pre-line leading-relaxed text-muted-foreground', !aboutOpen && 'line-clamp-6')}>
                  {about || tagline}
                </p>
                {(about || tagline).length > 320 && (
                  <button
                    type="button"
                    onClick={() => setAboutOpen((v) => !v)}
                    className="mt-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {aboutOpen ? 'Ver menos' : 'Leer más'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. Reseñas: solo si existen */}
      {reviews.length > 0 && (
        <section className="bg-card py-14">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className="text-2xl font-bold md:text-3xl">Lo que dicen las marcas</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {reviews.slice(0, 6).map((r) => (
                <blockquote key={r.id} className="rounded-2xl border border-border bg-background p-6">
                  <div className="flex gap-0.5" aria-label={`${r.rating} de 5 estrellas`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn('h-4 w-4', i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-border')} aria-hidden="true" />
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed">{r.text}</p>
                  {r.brand_name && <footer className="mt-3 text-sm font-semibold text-muted-foreground">{r.brand_name}</footer>}
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. ¿Trabajamos juntos? */}
      <section id="trabajamos-juntos" className="scroll-mt-20 px-4 py-14 md:px-6">
        <div className="mx-auto max-w-6xl rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground md:px-12">
          <h2 className="text-3xl font-bold">¿Trabajamos juntos?</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Cuéntale a {firstName} sobre tu marca y el video que necesitas.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {activeServices.length > 0 ? (
              <Button size="lg" variant="secondary" className="h-11 rounded-full px-5 text-sm sm:h-12 sm:px-6 sm:text-base" onClick={() => scrollToId('servicios')}>
                Ver servicios y precios
              </Button>
            ) : null}
            {!user && (
              <Button size="lg" variant="secondary" className="h-11 rounded-full px-5 text-sm sm:h-12 sm:px-6 sm:text-base" onClick={() => navigate('/auth')}>
                Inicia sesión para contratar
              </Button>
            )}
          </div>
          {socials.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {socials.map((s) => (
                <a
                  key={s.key}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {socialIcon(s.key.toLowerCase())}
                  {SOCIAL_LABELS[s.key.toLowerCase()] || s.key}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="pb-10 text-center text-xs text-muted-foreground">
        Portafolio creado con{' '}
        <a href="/" className="font-semibold text-primary underline-offset-4 hover:underline">
          Kreoon
        </a>
      </footer>
    </main>
  );
}

export default StudioUgcProfile;
