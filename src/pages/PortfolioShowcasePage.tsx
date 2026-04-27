import { useState, useEffect, useRef, useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LandingLayout } from "@/components/landing/LandingLayout";
import { HeroOrbCanvas } from "@/components/landing/sections/HeroOrbCanvas";
import { AuthModal } from "@/components/auth/AuthModal";
import { Play, Pause, Volume2, VolumeX, Loader2, Star, Eye } from "lucide-react";

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

function VideoCard({ content, index }: { content: PortfolioContent; index: number }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

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

  const sendCommand = (method: string, value?: number) => {
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
  };

  const toggleMute = () => {
    if (isMuted) {
      sendCommand("unmute");
      sendCommand("setVolume", 1);
    } else {
      sendCommand("mute");
      sendCommand("setVolume", 0);
    }
    setIsMuted(!isMuted);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      className="group relative"
    >
      <div
        className="relative overflow-hidden rounded-xl bg-black shadow-lg hover:shadow-kreoon-glow-sm transition-shadow"
        style={{ aspectRatio: "9/16" }}
      >
        <iframe
          ref={iframeRef}
          src={embedUrl}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          className="absolute left-1/2 top-1/2 pointer-events-none"
          style={{
            border: 0,
            width: "103%",
            height: "103%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-kreoon-bg-card z-10">
            <Loader2 className="h-6 w-6 animate-spin text-kreoon-purple-500" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />

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
          {content.brand_name && (
            <p className="text-[10px] text-kreoon-purple-300 truncate">
              Para {content.brand_name}
            </p>
          )}
        </div>

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

        <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/40 backdrop-blur-sm">
          <span className="text-[9px] font-medium text-green-400 uppercase">
            {content.status === "paid" ? "Pagado" : "Aprobado"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function PortfolioShowcasePage() {
  const containerRef = useRef<HTMLDivElement>(null);
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

              <p className="text-lg md:text-xl text-kreoon-text-secondary max-w-2xl mx-auto mb-8">
                Explora proyectos reales creados por nuestra comunidad de
                creadores. Contenido que ha sido aprobado y entregado a marcas
                reales.
              </p>

              <div className="flex items-center justify-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-kreoon-text-muted">
                    {content?.length || 0} proyectos
                  </span>
                </div>
                <button
                  onClick={() => refetch()}
                  className="text-kreoon-purple-400 hover:text-kreoon-purple-300 transition-colors"
                >
                  Rotar contenido
                </button>
              </div>
            </motion.div>
          </motion.section>

          <section className="relative pb-32">
            <div className="container mx-auto px-4">
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-kreoon-purple-500" />
                </div>
              ) : content && content.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                  {content.map((item, idx) => (
                    <VideoCard key={item.id} content={item} index={idx} />
                  ))}
                </div>
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
