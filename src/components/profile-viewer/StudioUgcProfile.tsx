/**
 * Portafolio público «Estudio UGC».
 *
 * Especificación: docs/hermes/enlace-profesional/estudio-ugc.html + portafolio-muestra.js (Galeria/Visor)
 * y restriccion-contacto.md (2026-10-01):
 *   - Sin redes, teléfono, correo, WhatsApp, enlaces externos ni CTA de contacto. Solo «Compartir portafolio».
 *   - Portada compacta: retrato, especialidad, nombre, frase, [Ver mis trabajos] [Compartir portafolio];
 *     en escritorio, dos trabajos verticales si hay más de 4 piezas.
 *   - Galería: ≤4 piezas fila estática; 5–8 un carrusel; más: «Trabajos destacados» + hasta 3 colecciones
 *     (máx. 10 tarjetas + «Ver las N piezas»), «Ver todas las colecciones» y «Ver todo el archivo».
 *   - «Ver todo»: cuadrícula 4/3/2, filtros Todo/Videos/Fotos solo si aportan, tandas de 12, volver
 *     conservando el scroll.
 *   - Visor: proporción original, anterior/siguiente, ←/→/Esc, un solo reproductor que se crea al abrir.
 *   - Nada inventado: «Lo que produzco» sale de conteos reales.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Image as ImageIcon, Share2, BadgeCheck, MapPin, ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getOptimizedImageUrl, getOptimizedThumbnail } from '@/lib/imageOptimization';
import { BunnyStreamPlayer, isBunnyUrl } from '@/components/profile-builder/blocks/BunnyStreamPlayer';
import { cn } from '@/lib/utils';
import type { CreatorPublicProfile } from '@/hooks/useCreatorPublicProfile';

type RawItem = CreatorPublicProfile['portfolioItems'][number];

interface Piece {
  id: string;
  title: string | null;
  kind: 'video' | 'foto';
  mediaUrl: string;
  thumb: string | null;
  duration: number | null;
  aspect: string;
  collection: string;
  featured: boolean;
  order: number;
}

type View =
  | { type: 'portfolio' }
  | { type: 'collections' }
  | { type: 'list'; key: string; title: string };

const CAROUSEL_MAX = 10;
const BATCH = 12;
const MAX_COLLECTIONS = 3;

// ─── Utilidades ──────────────────────────────────────────────────────────────

// Segunda barrera (la primera debe ser el servidor): no publicar datos de contacto en texto libre
const CONTACT_PATTERNS = [
  /https?:\/\/\S+/gi,
  /\bwww\.\S+/gi,
  /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g,
  /\b(?:wa\.me|api\.whatsapp\.com|t\.me|linktr\.ee)\/?\S*/gi,
  /(?:\+?\d[\s().-]?){8,}\d/g,
  /(^|\s)@[\w.]{3,}/g,
];

function redactContact(text: string | null | undefined): string {
  let out = (text || '').trim();
  for (const re of CONTACT_PATTERNS) out = out.replace(re, (_m, lead) => (typeof lead === 'string' && lead.trim() === '' ? lead : ''));
  return out.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

// Títulos que en realidad son nombres de archivo (UUID, IMG_1120, video.mp4) no se muestran
function cleanTitle(title: string | null | undefined): string | null {
  const t = redactContact(title);
  if (!t) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(t) || /^[0-9a-f-]{12,}$/i.test(t)) return null;
  if (/^(img|vid|mov|dsc|pxl|video)[_-]?\d+/i.test(t)) return null;
  if (/\.(mp4|mov|webm|jpe?g|png|heic)$/i.test(t)) return null;
  return t;
}

function mmss(sec: number | null): string | null {
  if (!sec || sec <= 0) return null;
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function toPiece(i: RawItem): Piece | null {
  const kind = i.media_type === 'video' ? 'video' : 'foto';
  const thumb = i.thumbnail_url || (kind === 'foto' ? i.media_url : null);
  if (!i.media_url && !thumb) return null;
  return {
    id: i.id,
    title: cleanTitle(i.title),
    kind,
    mediaUrl: i.media_url,
    thumb,
    duration: i.duration_seconds,
    aspect: i.aspect_ratio || (kind === 'video' ? '9:16' : '4:5'),
    collection: (i.category || '').trim() || 'Trabajos',
    featured: !!i.is_featured,
    order: i.display_order ?? 0,
  };
}

function aspectToCss(aspect: string): string {
  const [w, h] = aspect.split(':').map(Number);
  return w > 0 && h > 0 ? `${w} / ${h}` : '9 / 16';
}

// ─── Tarjeta ─────────────────────────────────────────────────────────────────

function PieceCard({ piece, onOpen, eager = false }: { piece: Piece; onOpen: (el: HTMLElement) => void; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const isVideo = piece.kind === 'video';
  const dur = mmss(piece.duration);
  const src = piece.thumb
    ? isVideo ? getOptimizedThumbnail(piece.thumb, 400) : getOptimizedImageUrl(piece.thumb, { width: 480 })
    : null;

  return (
    <figure className="min-w-0">
      <button
        type="button"
        onClick={(e) => onOpen(e.currentTarget)}
        data-piece={piece.id}
        className="group relative block aspect-[9/16] w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`${isVideo ? 'Ver video' : 'Ver foto'}${piece.title ? `: ${piece.title}` : ''}`}
      >
        {src && !failed ? (
          <img
            src={src}
            alt=""
            width={400}
            height={711}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => setFailed(true)}
            className={cn('absolute inset-0 h-full w-full', isVideo ? 'object-cover' : 'object-contain')}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-muted-foreground">
            Miniatura no disponible
          </span>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
          {isVideo ? <Play className="h-3 w-3 fill-current" aria-hidden="true" /> : <ImageIcon className="h-3 w-3" aria-hidden="true" />}
          {isVideo ? (dur ? `Video · ${dur}` : 'Video') : 'Foto'}
        </span>
        {isVideo && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg transition-transform group-hover:scale-110 motion-reduce:transition-none">
              <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
            </span>
          </span>
        )}
      </button>
      {piece.title && <figcaption className="mt-2 line-clamp-1 px-1 text-sm font-medium">{piece.title}</figcaption>}
    </figure>
  );
}

// ─── Carrusel ────────────────────────────────────────────────────────────────

function Carousel({
  title,
  count,
  pieces,
  onOpen,
  onSeeAll,
}: {
  title: string;
  count?: number;
  pieces: Piece[];
  onOpen: (list: Piece[], index: number, el: HTMLElement) => void;
  onSeeAll?: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const visible = pieces.slice(0, CAROUSEL_MAX);
  const extra = pieces.length > CAROUSEL_MAX;

  const update = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    setEdges({ start: t.scrollLeft <= 4, end: t.scrollLeft + t.clientWidth >= t.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    update();
    const t = trackRef.current;
    if (!t) return;
    const ro = new ResizeObserver(update);
    ro.observe(t);
    return () => ro.disconnect();
  }, [update, pieces.length]);

  const scrollBy = (dir: 1 | -1) => {
    const t = trackRef.current;
    if (t) t.scrollBy({ left: dir * t.clientWidth * 0.85, behavior: 'smooth' });
  };
  const overflow = !(edges.start && edges.end);

  return (
    <section className="mt-10 first:mt-0" aria-label={title}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h3 className="text-lg font-bold md:text-xl">
          {title}
          {count !== undefined && <span className="ml-2 text-sm font-normal text-muted-foreground">{plural(count, 'pieza', 'piezas')}</span>}
        </h3>
        <div className="flex items-center gap-2">
          {onSeeAll && (
            <button type="button" onClick={onSeeAll} className="text-sm font-semibold text-primary underline-offset-4 hover:underline" aria-label={`Ver todo: ${title}`}>
              Ver todo
            </button>
          )}
          {overflow && (
            <div className="hidden gap-1 sm:flex">
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => scrollBy(-1)} disabled={edges.start} aria-label="Anteriores">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => scrollBy(1)} disabled={edges.end} aria-label="Siguientes">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      <div
        ref={trackRef}
        onScroll={update}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] md:mx-0 md:scroll-px-0 md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {visible.map((p, i) => (
          <div key={p.id} className="w-[42%] shrink-0 snap-start sm:w-[30%] md:w-[22%]">
            <PieceCard piece={p} onOpen={(el) => onOpen(pieces, i, el)} />
          </div>
        ))}
        {extra && onSeeAll && (
          <div className="w-[42%] shrink-0 snap-start sm:w-[30%] md:w-[22%]">
            <button
              type="button"
              onClick={onSeeAll}
              className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-center text-sm font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Ver las {pieces.length} piezas
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Visor ───────────────────────────────────────────────────────────────────

function Viewer({
  list,
  index,
  onIndex,
  onClose,
}: {
  list: Piece[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const piece = list[index];
  const hasPrev = index > 0;
  const hasNext = index < list.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev) onIndex(index - 1);
      if (e.key === 'ArrowRight' && hasNext) onIndex(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, hasPrev, hasNext, onIndex]);

  if (!piece) return null;
  const poster = piece.thumb ? (piece.kind === 'video' ? getOptimizedThumbnail(piece.thumb, 720) : getOptimizedImageUrl(piece.thumb, { width: 1080 })) : undefined;
  const ratio = aspectToCss(piece.aspect);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 px-1 pb-3">
        <p className="min-w-0 truncate text-sm text-white/80">
          {index + 1} de {list.length}
          {piece.title ? ` · ${piece.title}` : ''}
        </p>
        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full text-white hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="Cerrar">
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <div className="relative max-h-full max-w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: ratio, height: '100%' }}>
          {/* key: un solo reproductor; al cambiar de pieza se desmonta (pausa y libera) y se crea el nuevo */}
          {piece.kind === 'video' ? (
            isBunnyUrl(piece.mediaUrl) ? (
              <BunnyStreamPlayer
                key={piece.id}
                videoUrl={piece.mediaUrl}
                autoplay={false}
                preload={false}
                aspectRatio={piece.aspect === '16:9' ? '16:9' : piece.aspect === '1:1' ? '1:1' : '9:16'}
                className="absolute inset-0 h-full w-full"
                borderRadius="none"
              />
            ) : (
              <video key={piece.id} src={piece.mediaUrl} poster={poster} controls playsInline preload="none" className="absolute inset-0 h-full w-full object-contain" />
            )
          ) : (
            <img key={piece.id} src={poster || piece.mediaUrl} alt={piece.title || 'Foto del portafolio'} className="absolute inset-0 h-full w-full object-contain" />
          )}
        </div>
        {hasPrev && (
          <Button variant="secondary" size="icon" className="absolute left-0 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full" onClick={() => onIndex(index - 1)} aria-label="Anterior">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        {hasNext && (
          <Button variant="secondary" size="icon" className="absolute right-0 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full" onClick={() => onIndex(index + 1)} aria-label="Siguiente">
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Vista «Ver todo» ────────────────────────────────────────────────────────

function ListView({
  title,
  pieces,
  onBack,
  onOpen,
}: {
  title: string;
  pieces: Piece[];
  onBack: () => void;
  onOpen: (list: Piece[], index: number, el: HTMLElement) => void;
}) {
  const [filter, setFilter] = useState<'todo' | 'video' | 'foto'>('todo');
  const [shown, setShown] = useState(BATCH);
  const videos = pieces.filter((p) => p.kind === 'video').length;
  const fotos = pieces.length - videos;
  const showFilters = videos > 0 && fotos > 0;
  const filtered = filter === 'todo' ? pieces : pieces.filter((p) => p.kind === filter);
  const visible = filtered.slice(0, shown);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al portafolio
      </button>
      <h2 className="mt-4 text-2xl font-bold md:text-3xl">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{plural(pieces.length, 'pieza', 'piezas')}</p>

      {showFilters && (
        <div className="mt-4 flex gap-2" role="group" aria-label="Filtrar">
          {([['todo', `Todo (${pieces.length})`], ['video', `Videos (${videos})`], ['foto', `Fotos (${fotos})`]] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => { setFilter(k); setShown(BATCH); }}
              className={cn(
                'h-9 rounded-full px-4 text-sm font-medium transition-colors',
                filter === k ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((p, i) => (
          <PieceCard key={p.id} piece={p} onOpen={(el) => onOpen(filtered, i, el)} />
        ))}
      </div>

      {filtered.length > shown && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" className="h-11 rounded-full px-6" onClick={() => setShown((n) => n + BATCH)}>
            Ver más ({filtered.length - shown})
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

export function StudioUgcProfile({ data }: { data: CreatorPublicProfile }) {
  const { profile, portfolioItems } = data;
  const { toast } = useToast();
  const [view, setView] = useState<View>({ type: 'portfolio' });
  const [viewer, setViewer] = useState<{ list: Piece[]; index: number } | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const savedScrollRef = useRef(0);

  const pieces = useMemo(() => {
    return portfolioItems
      .filter((i) => i.is_public !== false)
      .map(toPiece)
      .filter((p): p is Piece => !!p)
      .sort((a, b) => a.order - b.order);
  }, [portfolioItems]);

  const featured = useMemo(() => {
    const marked = pieces.filter((p) => p.featured);
    return marked.length > 0 ? marked : pieces;
  }, [pieces]);

  const collections = useMemo(() => {
    const map = new Map<string, Piece[]>();
    pieces.forEach((p) => map.set(p.collection, [...(map.get(p.collection) || []), p]));
    return [...map.entries()]
      .map(([title, list]) => ({ key: `c:${title}`, title, list }))
      .sort((a, b) => b.list.length - a.list.length);
  }, [pieces]);

  const specialty = profile.categories?.[0] || profile.content_types?.[0] || 'Creador de contenido UGC';
  const location = [profile.location_city, profile.location_country].filter(Boolean).join(', ');
  const tagline = redactContact(profile.bio);
  const about = redactContact(profile.bio_full);
  const heroPair = pieces.length > 4 ? featured.filter((p) => p.kind === 'video').slice(0, 2) : [];
  const totalVideos = pieces.filter((p) => p.kind === 'video').length;
  const totalFotos = pieces.length - totalVideos;

  const shareUrl = profile.slug ? `${window.location.origin}/p/${profile.slug}` : window.location.href;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${profile.display_name} · Portafolio en Kreoon`, url: shareUrl });
      } catch {
        /* el usuario canceló */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Enlace copiado', description: 'Pégalo donde quieras compartir tu portafolio.' });
    } catch {
      toast({ title: 'No pudimos copiar el enlace', description: shareUrl, variant: 'destructive' });
    }
  };

  const openViewer = (list: Piece[], index: number, el: HTMLElement) => {
    returnFocusRef.current = el;
    setViewer({ list, index });
  };

  const goTo = (next: View) => {
    if (view.type === 'portfolio') savedScrollRef.current = window.scrollY;
    setView(next);
    window.scrollTo({ top: 0 });
  };

  const backToPortfolio = () => {
    setView({ type: 'portfolio' });
    requestAnimationFrame(() => window.scrollTo({ top: savedScrollRef.current }));
  };

  const scrollToWorks = () => document.getElementById('trabajos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Filas de la galería según cantidad de piezas
  const rows = useMemo(() => {
    const U = pieces.length;
    if (U === 0) return [];
    if (U <= 8) return [{ key: 'all', title: 'Trabajos', list: pieces, seeAll: false }];
    const out: { key: string; title: string; list: Piece[]; seeAll: boolean; count?: number }[] = [
      { key: 'featured', title: 'Trabajos destacados', list: featured, seeAll: featured.length > CAROUSEL_MAX },
    ];
    if (collections.length > 1) {
      collections.slice(0, MAX_COLLECTIONS).forEach((c) => out.push({ key: c.key, title: c.title, list: c.list, seeAll: true, count: c.list.length }));
    }
    return out;
  }, [pieces, featured, collections]);

  const viewerDialog = (
    <Dialog open={!!viewer} onOpenChange={(open) => { if (!open) setViewer(null); }}>
      <DialogContent
        className="h-[92vh] max-w-5xl border-0 bg-zinc-950/95 p-4 sm:rounded-2xl [&>button]:hidden"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">Visor del portafolio</DialogTitle>
        <DialogDescription className="sr-only">Usa las flechas para ver la pieza anterior o siguiente y Esc para cerrar.</DialogDescription>
        {viewer && (
          <Viewer
            list={viewer.list}
            index={viewer.index}
            onIndex={(i) => setViewer((v) => (v ? { ...v, index: i } : v))}
            onClose={() => setViewer(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );

  // Vistas internas «Ver todo» / colecciones (misma página, sin recargar)
  if (view.type === 'list') {
    const list = view.key === 'archive' ? pieces : view.key === 'featured' ? featured : collections.find((c) => c.key === view.key)?.list || [];
    return (
      <main className="min-h-screen bg-background text-foreground">
        <ListView title={view.title} pieces={list} onBack={backToPortfolio} onOpen={openViewer} />
        {viewerDialog}
      </main>
    );
  }

  if (view.type === 'collections') {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
          <button type="button" onClick={backToPortfolio} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al portafolio
          </button>
          <h2 className="mt-4 text-2xl font-bold md:text-3xl">Colecciones</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {collections.map((c) => {
              const cover = c.list[0];
              const src = cover?.thumb ? getOptimizedThumbnail(cover.thumb, 400) : null;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => goTo({ type: 'list', key: c.key, title: c.title })}
                  className="group text-left focus-visible:outline-none"
                  aria-label={`${c.title}, ${plural(c.list.length, 'pieza', 'piezas')}. Abrir colección.`}
                >
                  <span className="relative block aspect-[9/16] overflow-hidden rounded-2xl bg-muted ring-1 ring-border group-focus-visible:ring-2 group-focus-visible:ring-primary">
                    {src && <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
                  </span>
                  <span className="mt-2 block px-1 text-sm font-semibold">{c.title}</span>
                  <span className="block px-1 text-xs text-muted-foreground">{plural(c.list.length, 'pieza', 'piezas')}</span>
                </button>
              );
            })}
          </div>
        </div>
        {viewerDialog}
      </main>
    );
  }

  return (
    <main className="bg-background text-foreground" aria-label={`Portafolio de ${profile.display_name}`}>
      {/* 1. Portada compacta */}
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-8 pt-6 md:grid-cols-[1.2fr_1fr] md:px-6 md:pb-12 md:pt-12">
        <div>
          <div className="flex items-center gap-4">
            {profile.avatar_url && (
              <img
                src={getOptimizedImageUrl(profile.avatar_url, { width: 192 })}
                alt={`Foto de ${profile.display_name}`}
                width={80}
                height={80}
                className="h-16 w-16 shrink-0 rounded-full object-cover object-center ring-4 ring-card shadow-sm md:h-20 md:w-20"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">{specialty}</p>
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
                {profile.display_name}
                {profile.is_verified && <BadgeCheck className="h-6 w-6 text-primary" aria-label="Perfil verificado" />}
              </h1>
            </div>
          </div>
          {tagline && <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">{tagline}</p>}
          {location && (
            <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" aria-hidden="true" /> {location}
            </p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            {pieces.length > 0 && (
              <Button className="h-11 rounded-full px-3 text-sm sm:px-6 sm:text-base" onClick={scrollToWorks}>
                Ver mis trabajos
              </Button>
            )}
            <Button
              variant="outline"
              className="h-11 rounded-full border-primary/40 px-3 text-sm text-primary hover:bg-primary/5 hover:text-primary sm:px-6 sm:text-base"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" aria-hidden="true" /> Compartir portafolio
            </Button>
          </div>
        </div>

        {heroPair.length > 0 && (
          <div className="hidden grid-cols-2 gap-3 md:grid" aria-label="Dos trabajos de la portada">
            {heroPair.map((p, i) => (
              <div key={p.id} className={cn(i === 1 && 'mt-10')}>
                <PieceCard piece={p} eager onOpen={(el) => openViewer(heroPair, i, el)} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Galería */}
      {rows.length > 0 && (
        <section id="trabajos" className="scroll-mt-20 border-t border-border bg-card py-10 md:py-14" aria-label="Trabajos">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            {pieces.length <= 4 ? (
              <section aria-label="Trabajos">
                <h3 className="mb-3 text-lg font-bold md:text-xl">Trabajos</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {pieces.map((p, i) => (
                    <PieceCard key={p.id} piece={p} onOpen={(el) => openViewer(pieces, i, el)} />
                  ))}
                </div>
              </section>
            ) : (
              rows.map((r) => (
                <Carousel
                  key={r.key}
                  title={r.title}
                  count={r.count}
                  pieces={r.list}
                  onOpen={openViewer}
                  onSeeAll={r.seeAll ? () => goTo({ type: 'list', key: r.key, title: r.title }) : undefined}
                />
              ))
            )}

            {pieces.length > 8 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {collections.length > 1 && (
                  <Button variant="outline" className="h-11 rounded-full px-5" onClick={() => goTo({ type: 'collections' })}>
                    Ver todas las colecciones ({collections.length})
                  </Button>
                )}
                <Button variant="outline" className="h-11 rounded-full px-5" onClick={() => goTo({ type: 'list', key: 'archive', title: 'Todo el archivo' })}>
                  Ver todo el archivo ({pieces.length})
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3. Sobre mí + lo que produzco (conteos reales) */}
      {(about || tagline || pieces.length > 0) && (
        <section className="py-10 md:py-14" aria-labelledby="t-sobre">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[1.4fr_1fr] md:px-6">
            {(about || tagline) && (
              <div>
                <h2 id="t-sobre" className="text-xl font-bold md:text-2xl">Sobre mí</h2>
                <p className={cn('mt-3 whitespace-pre-line leading-relaxed text-muted-foreground', !aboutOpen && 'line-clamp-6')}>
                  {about || tagline}
                </p>
                {(about || tagline).length > 320 && (
                  <button type="button" onClick={() => setAboutOpen((v) => !v)} className="mt-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                    {aboutOpen ? 'Ver menos' : 'Leer más'}
                  </button>
                )}
              </div>
            )}
            {pieces.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-lg font-bold">Lo que produzco</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {totalVideos > 0 && <li className="flex justify-between gap-3"><span>Videos</span><span className="font-semibold">{totalVideos}</span></li>}
                  {totalFotos > 0 && <li className="flex justify-between gap-3"><span>Fotos</span><span className="font-semibold">{totalFotos}</span></li>}
                  {collections.length > 1 &&
                    collections.slice(0, 5).map((c) => (
                      <li key={c.key} className="flex justify-between gap-3 text-muted-foreground"><span>{c.title}</span><span>{c.list.length}</span></li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="pb-10 text-center text-xs text-muted-foreground">
        Portafolio en{' '}
        <a href="/" className="font-semibold text-primary underline-offset-4 hover:underline">
          Kreoon
        </a>
      </footer>

      {viewerDialog}
    </main>
  );
}

export default StudioUgcProfile;
