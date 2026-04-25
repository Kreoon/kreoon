import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { usePublicVideos, usePublicStats } from "@/hooks/usePublicShowcase";
import { Volume2, VolumeX, Loader2 } from "lucide-react";

/**
 * Envía comando player.js al iframe Bunny Stream vía postMessage.
 * Bunny soporta el protocolo player.js para mute/unmute/setVolume.
 */
function sendBunnyCommand(
  iframe: HTMLIFrameElement | null,
  method: "mute" | "unmute" | "setVolume",
  value?: number
) {
  if (!iframe?.contentWindow) return;
  try {
    const message = JSON.stringify({
      context: "player.js",
      version: "0.0.12",
      method,
      ...(value !== undefined ? { value } : {}),
    });
    iframe.contentWindow.postMessage(message, "*");
  } catch {
    // silencioso
  }
}

function forceMaxVolume(iframe: HTMLIFrameElement | null) {
  sendBunnyCommand(iframe, "unmute");
  sendBunnyCommand(iframe, "setVolume", 1);
  sendBunnyCommand(iframe, "setVolume", 100);
}

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    video_url: string;
    thumbnail_url: string | null;
    creator_handle: string;
    brand_name: string;
  };
  index: number;
  unmuted: boolean;
  onToggleAudio: () => void;
}

function VideoCard({ video, index, unmuted, onToggleAudio }: VideoCardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Construir URL del iframe con parámetros de autoplay
  const embedUrl = React.useMemo(() => {
    const url = new URL(video.video_url);
    url.searchParams.set("autoplay", "true");
    url.searchParams.set("loop", "true");
    url.searchParams.set("muted", "true");
    url.searchParams.set("preload", "true");
    url.searchParams.set("responsive", "true");
    return url.toString();
  }, [video.video_url]);

  // Control de audio via player.js
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !isLoaded) return;

    if (unmuted) {
      forceMaxVolume(iframe);
      const t1 = setTimeout(() => forceMaxVolume(iframe), 250);
      const t2 = setTimeout(() => forceMaxVolume(iframe), 800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      sendBunnyCommand(iframe, "mute");
      sendBunnyCommand(iframe, "setVolume", 0);
      const t1 = setTimeout(() => {
        sendBunnyCommand(iframe, "mute");
        sendBunnyCommand(iframe, "setVolume", 0);
      }, 250);
      return () => clearTimeout(t1);
    }
  }, [unmuted, isLoaded]);

  const handleIframeLoad = () => {
    setIsLoaded(true);
    // Asegurar mute inicial
    const iframe = iframeRef.current;
    if (iframe) {
      sendBunnyCommand(iframe, "mute");
      sendBunnyCommand(iframe, "setVolume", 0);
    }
  };

  const handleAudioClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleAudio();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full"
    >
      <div
        className="relative overflow-hidden rounded-xl bg-black shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
        style={{ aspectRatio: "9/16" }}
      >
        {/* Bunny Stream iframe - scale para ocultar bordes */}
        <iframe
          ref={iframeRef}
          src={embedUrl}
          loading="lazy"
          onLoad={handleIframeLoad}
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

        {/* Bottom Gradient Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />

        {/* Content Info */}
        <div className="absolute inset-x-0 bottom-0 p-3 z-10">
          <p className="text-xs font-medium text-white">@{video.creator_handle}</p>
          <p className="text-[10px] text-kreoon-purple-300">{video.brand_name}</p>
        </div>

        {/* Mute/Unmute Button */}
        <button
          type="button"
          onClick={handleAudioClick}
          className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kreoon-purple-500"
          aria-label={unmuted ? "Silenciar video" : "Activar sonido"}
        >
          {unmuted ? (
            <Volume2 className="h-3.5 w-3.5" />
          ) : (
            <VolumeX className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </motion.div>
  );
}

export function VideoShowcase() {
  const { data: videos, isLoading } = usePublicVideos(6);
  const { data: stats } = usePublicStats();
  const [unmutedId, setUnmutedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <section className="relative py-20 sm:py-28 overflow-hidden bg-kreoon-bg-primary">
        <div className="max-w-7xl mx-auto px-4 flex justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-kreoon-purple-500" />
        </div>
      </section>
    );
  }

  if (!videos || videos.length === 0) return null;

  return (
    <section
      id="portafolio"
      className="relative py-20 sm:py-28 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0a0a0f 0%, #060508 50%, #0a0a0f 100%)",
      }}
    >
      {/* Glow ambiental */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(168,85,247,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12 sm:mb-16"
        >
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-3 mb-5">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-kreoon-purple-500/60" />
            <span className="text-[11px] sm:text-xs uppercase tracking-[0.35em] text-kreoon-purple-400/80">
              Portafolio real
            </span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-kreoon-purple-500/60" />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Videos UGC reales,
            <br />
            <span className="bg-gradient-to-r from-kreoon-purple-400 to-kreoon-purple-600 bg-clip-text text-transparent">
              hechos por creadores reales.
            </span>
          </h2>
          <p className="mt-4 text-kreoon-text-secondary text-base sm:text-lg">
            Activa el sonido en el video que quieras escuchar.
          </p>
        </motion.div>

        {/* Video Grid - Single Row */}
        <div className="no-scrollbar flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-2 lg:overflow-visible lg:grid lg:grid-cols-6 lg:gap-4 lg:pb-0">
          {videos.map((video, idx) => (
            <div
              key={video.id}
              className="snap-start flex-shrink-0 w-[42vw] sm:w-[28vw] md:w-[20vw] lg:w-auto"
            >
              <VideoCard
                video={video}
                index={idx}
                unmuted={unmutedId === video.id}
                onToggleAudio={() =>
                  setUnmutedId(prev => (prev === video.id ? null : video.id))
                }
              />
            </div>
          ))}
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-8 md:gap-16"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-kreoon-purple-400 to-kreoon-purple-600 bg-clip-text text-transparent">
              +{stats?.videos_approved ? (stats.videos_approved + 3200).toLocaleString() : "—"}
            </span>
            <span className="text-xs sm:text-sm text-kreoon-text-muted">Videos Aprobados</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-kreoon-purple-400 to-kreoon-purple-600 bg-clip-text text-transparent">
              +{stats?.creators_count || "—"}
            </span>
            <span className="text-xs sm:text-sm text-kreoon-text-muted">Creadores Activos</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-kreoon-purple-400 to-kreoon-purple-600 bg-clip-text text-transparent">
              +{stats?.brands_count || "—"}
            </span>
            <span className="text-xs sm:text-sm text-kreoon-text-muted">Marcas</span>
          </div>
        </motion.div>
      </div>

      {/* Decorative Lines */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </section>
  );
}
