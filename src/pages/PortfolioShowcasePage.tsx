import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LandingLayout } from "@/components/landing/LandingLayout";
import { HeroOrbCanvas } from "@/components/landing/sections/HeroOrbCanvas";
import { AuthModal } from "@/components/auth/AuthModal";
import { Play, Volume2, VolumeX, Loader2 } from "lucide-react";
import { getBunnyThumbnailUrl } from "@/hooks/useHLSPlayer";
import { getOptimizedThumbnail } from "@/lib/imageOptimization";

interface PortfolioContent {
  id: string;
  title: string;
  video_url: string;
  bunny_embed_url: string | null;
  thumbnail_url: string | null;
  creator_name: string;
  creator_avatar: string | null;
  brand_name: string | null;
  status: string;
  rating: number | null;
  views_count: number;
}

async function fetchPortfolioContent(): Promise<PortfolioContent[]> {
  const { data, error } = await (supabase as any).rpc('get_public_org_content_page', {
    org_slug: 'ugc-colombia',
    max_items: 50,
  });

  if (error) throw error;

  // El RPC devuelve { org, stats, content }
  const content = data?.content || [];

  return content.map((item: any) => ({
    id: item.id,
    title: item.title || "Sin título",
    video_url: item.bunny_embed_url || item.video_url,
    bunny_embed_url: item.bunny_embed_url,
    thumbnail_url: item.thumbnail_url,
    creator_name: item.creator_name || "Creador",
    creator_avatar: item.creator_avatar || null,
    brand_name: null,
    status: item.status,
    rating: null,
    views_count: item.views_count || 0,
  }));
}

// Primeros N videos cargan inmediatamente según breakpoint
// 2 cols (mobile) = 4, 3 cols (sm) = 6, 4 cols (md) = 8, 5 cols (lg) = 10, 6 cols (xl) = 12
const EAGER_LOAD_COUNT = 12;

function VideoCard({ content, index, eager = false }: { content: PortfolioContent; index: number; eager?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isVisible, setIsVisible] = useState(eager);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Intersection Observer para lazy loading (solo si no es eager)
  useEffect(() => {
    if (eager) return;

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px", threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [eager]);

  // Generar thumbnail optimizado
  const thumbnailUrl = useMemo(() => {
    if (content.thumbnail_url) {
      return getOptimizedThumbnail(content.thumbnail_url, 400, 711, 80);
    }
    const bunnyThumb = getBunnyThumbnailUrl(content.video_url);
    if (bunnyThumb) {
      return getOptimizedThumbnail(bunnyThumb, 400, 711, 80);
    }
    return null;
  }, [content.thumbnail_url, content.video_url]);

  const embedUrl = useMemo(() => {
    if (!content.video_url) return "";
    try {
      const url = new URL(content.video_url);
      url.searchParams.set("autoplay", "true");
      url.searchParams.set("loop", "true");
      url.searchParams.set("muted", "true");
      url.searchParams.set("preload", "true");
      return url.toString();
    } catch {
      return content.video_url;
    }
  }, [content.video_url]);

  const sendCommand = useCallback((method: string, value?: number) => {
    if (!iframeRef.current?.contentWindow) return;
    try {
      const message = JSON.stringify({
        context: "player.js",
        version: "0.0.12",
        method,
        ...(value !== undefined ? { value } : {}),
      });
      iframeRef.current.contentWindow.postMessage(message, "*");
    } catch {}
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      sendCommand("unmute");
      sendCommand("setVolume", 1);
    } else {
      sendCommand("mute");
      sendCommand("setVolume", 0);
    }
    setIsMuted(!isMuted);
  }, [isMuted, sendCommand]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.4 }}
      className="group relative"
    >
      <div
        className="relative overflow-hidden rounded-xl bg-kreoon-bg-card shadow-lg hover:shadow-kreoon-glow-sm transition-shadow"
        style={{ aspectRatio: "9/16" }}
      >
        {/* Thumbnail - siempre visible hasta que el video cargue */}
        {thumbnailUrl && !isPlaying && (
          <img
            src={thumbnailUrl}
            alt={`Video de ${content.creator_name}`}
            loading={eager ? "eager" : "lazy"}
            fetchpriority={eager ? "high" : "auto"}
            className="absolute inset-0 w-full h-full object-cover z-[1]"
          />
        )}

        {/* Play button overlay cuando no está reproduciendo */}
        {!isPlaying && isVisible && (
          <div className="absolute inset-0 flex items-center justify-center z-[5]">
            <div className="rounded-full p-4 bg-kreoon-purple-500/80 backdrop-blur-sm">
              <Play className="h-6 w-6 text-white fill-white" />
            </div>
          </div>
        )}

        {/* Loading spinner cuando está visible pero no ha cargado */}
        {isVisible && !isPlaying && !thumbnailUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-kreoon-bg-card z-[2]">
            <Loader2 className="h-6 w-6 animate-spin text-kreoon-purple-500" />
          </div>
        )}

        {/* Video iframe - solo se renderiza cuando es visible */}
        {isVisible && (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            loading={eager ? "eager" : "lazy"}
            onLoad={() => setIsPlaying(true)}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            className="absolute left-1/2 top-1/2 pointer-events-none z-[3]"
            style={{
              border: 0,
              width: "103%",
              height: "103%",
              transform: "translate(-50%, -50%)",
              opacity: isPlaying ? 1 : 0,
            }}
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />

        {/* Creator info */}
        <div className="absolute inset-x-0 bottom-0 p-3 z-10">
          <div className="flex items-center gap-2 mb-1">
            {content.creator_avatar ? (
              <img
                src={content.creator_avatar}
                alt={content.creator_name}
                className="h-6 w-6 rounded-full object-cover border border-white/20"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-kreoon-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                {content.creator_name[0]}
              </div>
            )}
            <span className="text-xs font-medium text-white truncate">
              {content.creator_name}
            </span>
          </div>
        </div>

        {/* Mute button - solo visible cuando está reproduciendo */}
        {isPlaying && (
          <button
            type="button"
            onClick={toggleMute}
            className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Cuántos videos cargar por lote al hacer scroll
const BATCH_SIZE = 12;

export default function PortfolioShowcasePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(EAGER_LOAD_COUNT);
  const [authModal, setAuthModal] = useState<{
    open: boolean;
    tab: "login" | "register";
  }>({ open: false, tab: "login" });

  const { data: content, isLoading, refetch } = useQuery({
    queryKey: ["portfolio-showcase"],
    queryFn: fetchPortfolioContent,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Preload thumbnails de los primeros videos para carga instantánea
  useEffect(() => {
    if (!content?.length) return;

    const preloadCount = Math.min(EAGER_LOAD_COUNT, content.length);
    const preloadedLinks: HTMLLinkElement[] = [];

    content.slice(0, preloadCount).forEach((item, idx) => {
      let thumbUrl: string | null = null;

      if (item.thumbnail_url) {
        thumbUrl = getOptimizedThumbnail(item.thumbnail_url, 400, 711, 80);
      } else {
        const bunnyThumb = getBunnyThumbnailUrl(item.video_url);
        if (bunnyThumb) {
          thumbUrl = getOptimizedThumbnail(bunnyThumb, 400, 711, 80);
        }
      }

      if (thumbUrl) {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = thumbUrl;
        if (idx < 6) link.setAttribute("fetchpriority", "high");
        document.head.appendChild(link);
        preloadedLinks.push(link);
      }
    });

    return () => {
      preloadedLinks.forEach((link) => link.remove());
    };
  }, [content]);

  // Cargar más videos cuando el usuario hace scroll al final
  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !content?.length) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && visibleCount < content.length) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, content.length));
        }
      },
      { rootMargin: "200px", threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [content?.length, visibleCount]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const headerY = useTransform(scrollYProgress, [0, 0.3], [0, -100]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

  const handleOpenAuth = (tab: "login" | "register") => {
    setAuthModal({ open: true, tab });
  };

  return (
    <>
      <HeroOrbCanvas />
      <LandingLayout onOpenAuth={handleOpenAuth}>
        <div ref={containerRef} className="relative min-h-screen">
          <motion.section
            style={{ y: headerY, opacity: headerOpacity }}
            className="relative pt-20 pb-16 text-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="container mx-auto px-4"
            >
              <div className="inline-flex items-center gap-3 mb-6">
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-kreoon-purple-500/60" />
                <span className="text-xs uppercase tracking-[0.35em] text-kreoon-purple-400/80">
                  Proyectos Reales
                </span>
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-kreoon-purple-500/60" />
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
                Portafolio de{" "}
                <span className="bg-gradient-to-r from-kreoon-purple-400 to-kreoon-purple-600 bg-clip-text text-transparent">
                  Contenido Aprobado
                </span>
              </h1>

              <p className="text-lg md:text-xl text-kreoon-text-secondary max-w-2xl mx-auto">
                Explora proyectos reales creados por nuestra comunidad de
                creadores. Contenido que ha sido aprobado y entregado a marcas
                reales.
              </p>
            </motion.div>
          </motion.section>

          <section className="relative pb-32">
            <div className="container mx-auto px-4">
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-kreoon-purple-500" />
                </div>
              ) : content && content.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                    {content.slice(0, visibleCount).map((item, idx) => (
                      <VideoCard
                        key={item.id}
                        content={item}
                        index={idx}
                        eager={idx < EAGER_LOAD_COUNT}
                      />
                    ))}
                  </div>
                  {/* Trigger para cargar más */}
                  {visibleCount < content.length && (
                    <div
                      ref={loadMoreRef}
                      className="flex justify-center py-8"
                    >
                      <Loader2 className="h-6 w-6 animate-spin text-kreoon-purple-500/50" />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20">
                  <p className="text-kreoon-text-muted">
                    No hay contenido disponible en este momento.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="relative py-20 border-t border-white/5">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                ¿Quieres que tu contenido aparezca aquí?
              </h2>
              <p className="text-kreoon-text-secondary mb-8 max-w-xl mx-auto">
                Únete a nuestra comunidad de creadores y trabaja con marcas
                reales.
              </p>
              <button
                onClick={() => handleOpenAuth("register")}
                className="px-8 py-4 rounded-sm bg-kreoon-purple-600 hover:bg-kreoon-purple-500 text-white font-medium transition-colors shadow-kreoon-glow-sm hover:shadow-kreoon-glow"
              >
                Comenzar como Creador
              </button>
            </div>
          </section>
        </div>
      </LandingLayout>

      <AuthModal
        open={authModal.open}
        onClose={() => setAuthModal((prev) => ({ ...prev, open: false }))}
        initialTab={authModal.tab}
      />
    </>
  );
}
