import { useEffect, useRef, useState, forwardRef } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AutoPauseVideoProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  index?: number;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  contentId?: string; // For thumbnail resolution
  thumbnailUrl?: string | null; // Direct thumbnail URL if available
}

// Extract video ID from Bunny URLs
function extractVideoId(url: string): string | null {
  if (!url) return null;
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/embed\/\d+\/([a-f0-9-]+)/i);
  if (embedMatch) return embedMatch[1];
  const cdnMatch = url.match(/b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdnMatch) return cdnMatch[1];
  return null;
}

// Build proxied thumbnail URL through edge function
function getProxiedThumbnailUrl(contentId: string, videoId: string): string {
  const supabaseUrl = (supabase as any).supabaseUrl as string;
  return `${supabaseUrl}/functions/v1/bunny-thumbnail?content_id=${encodeURIComponent(contentId)}&video_id=${encodeURIComponent(videoId)}`;
}

// Build direct Bunny thumbnail URL (fallback when no contentId)
function getDirectThumbnailUrl(url: string): string | null {
  // Try to extract library ID and video ID
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([a-f0-9-]+)/i);
  if (embedMatch) {
    const [, libraryId, videoId] = embedMatch;
    return `https://vz-${libraryId}.b-cdn.net/${videoId}/thumbnail.jpg`;
  }
  const cdnMatch = url.match(/(vz-\d+\.b-cdn\.net)\/([a-f0-9-]+)/i);
  if (cdnMatch) {
    const [, host, videoId] = cdnMatch;
    return `https://${host}/${videoId}/thumbnail.jpg`;
  }
  return null;
}

export const AutoPauseVideo = forwardRef<HTMLDivElement, AutoPauseVideoProps>(
  ({ src, className, style, index = 0, autoPlay = true, muted = true, loop = true, contentId, thumbnailUrl }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [iframeSrc, setIframeSrc] = useState<string | null>(null);
    const [resolvedThumbnail, setResolvedThumbnail] = useState<string | null>(null);
    const [thumbnailError, setThumbnailError] = useState(false);

    // Resolve thumbnail URL
    useEffect(() => {
      // Use provided thumbnail if valid
      if (thumbnailUrl && !thumbnailUrl.includes('iframe.mediadelivery.net/embed')) {
        setResolvedThumbnail(thumbnailUrl);
        return;
      }

      const videoId = extractVideoId(src);
      if (!videoId) {
        // Try direct thumbnail URL as fallback
        const directUrl = getDirectThumbnailUrl(src);
        setResolvedThumbnail(directUrl);
        return;
      }

      // Use proxied URL if contentId is available, otherwise direct URL
      if (contentId) {
        setResolvedThumbnail(getProxiedThumbnailUrl(contentId, videoId));
      } else {
        const directUrl = getDirectThumbnailUrl(src);
        setResolvedThumbnail(directUrl);
      }
    }, [src, contentId, thumbnailUrl]);

    // Merge refs if external ref is provided
    const setRefs = (node: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    // Build Bunny embed URL with autoplay params
    const buildBunnyUrl = (baseUrl: string, shouldAutoplay: boolean) => {
      try {
        const url = new URL(baseUrl);
        if (shouldAutoplay) {
          url.searchParams.set('autoplay', 'true');
          if (muted) url.searchParams.set('muted', 'true');
          if (loop) url.searchParams.set('loop', 'true');
        }
        return url.toString();
      } catch {
        // If URL parsing fails, append params manually
        const separator = baseUrl.includes('?') ? '&' : '?';
        const params = shouldAutoplay 
          ? `autoplay=true${muted ? '&muted=true' : ''}${loop ? '&loop=true' : ''}`
          : '';
        return params ? `${baseUrl}${separator}${params}` : baseUrl;
      }
    };

    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
            setIsVisible(visible);

            if (visible) {
              // Load iframe with autoplay when visible
              setIframeSrc(buildBunnyUrl(src, autoPlay));
            } else {
              // Unload iframe when not visible to stop playback
              setIframeSrc(null);
            }
          });
        },
        {
          threshold: 0.5,
          rootMargin: "0px"
        }
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => {
        observer.disconnect();
      };
    }, [src, autoPlay, muted, loop]);

    // For Bunny Stream embeds, use iframe unloading strategy
    const isBunnyEmbed = src.includes('iframe.mediadelivery.net') || src.includes('bunny');

    if (isBunnyEmbed) {
      return (
        <div ref={setRefs} className={className} style={style}>
          {iframeSrc ? (
            <iframe
              src={iframeSrc}
              loading="lazy"
              className="w-full h-full border-0"
              style={{ aspectRatio: '9/16' }}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/50 text-muted-foreground relative cursor-pointer group/thumb">
              {resolvedThumbnail && !thumbnailError ? (
                <>
                  <img 
                    src={resolvedThumbnail} 
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                    onError={() => setThumbnailError(true)}
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover/thumb:bg-black/40 transition-colors">
                    <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm group-hover/thumb:bg-white/30 transition-all group-hover/thumb:scale-110">
                      <Play className="h-8 w-8 text-white" fill="currentColor" />
                    </div>
                    <p className="absolute bottom-3 text-white text-xs">Scroll para reproducir</p>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="p-3 rounded-full bg-primary/20 inline-block">
                    <Play className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-xs mt-2">Scroll para ver</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // For direct video files, use native video element controls
    if (src.match(/\.(mp4|webm|ogg)$/i) || src.includes('b-cdn.net')) {
      return (
        <AutoPauseNativeVideo
          ref={ref as React.Ref<HTMLDivElement>}
          src={src}
          className={className}
          style={style}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
        />
      );
    }

    // For other embeds (YouTube, TikTok, etc.), just render normally
    return (
      <div ref={setRefs} className={className} style={style}>
        <iframe
          src={src}
          loading="lazy"
          className="w-full h-full border-0"
          style={style}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
);

AutoPauseVideo.displayName = "AutoPauseVideo";

function VolumeToggle({
  overlayTargetRef,
  initialMuted,
}: {
  overlayTargetRef: React.RefObject<HTMLVideoElement>;
  initialMuted: boolean;
}) {
  const [isMuted, setIsMuted] = useState(initialMuted);

  useEffect(() => {
    const el = overlayTargetRef.current;
    if (!el) return;
    el.muted = isMuted;
    if (!isMuted) {
      // Ensure volume isn't zero when unmuting
      if (el.volume === 0) el.volume = 1;
    }
  }, [isMuted, overlayTargetRef]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIsMuted((v) => !v);
      }}
      className="absolute top-2 right-2 z-20 p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
      aria-label={isMuted ? "Activar volumen" : "Silenciar"}
    >
      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
}


// Separate component for native video elements with pause control
interface AutoPauseNativeVideoProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

const AutoPauseNativeVideo = forwardRef<HTMLDivElement, AutoPauseNativeVideoProps>(
  ({ src, className, style, autoPlay = true, muted = true, loop = true }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const setRefs = (node: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (videoRef.current) {
              if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                // Video is visible - autoplay if enabled
                if (autoPlay) {
                  videoRef.current.play().catch(() => {
                    // Autoplay was prevented, user will need to interact
                  });
                }
              } else {
                // Video is not visible - pause it
                videoRef.current.pause();
              }
            }
          });
        },
        {
          threshold: 0.5,
          rootMargin: "0px"
        }
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => {
        observer.disconnect();
      };
    }, [autoPlay]);

    return (
      <div ref={setRefs} className={cn('relative', className)} style={style}>
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain"
          playsInline
          muted={muted}
          loop={loop}
        />

        {/* Volume toggle (only control shown) */}
        <VolumeToggle overlayTargetRef={videoRef} initialMuted={!!muted} />
      </div>
    );
  }
);

AutoPauseNativeVideo.displayName = "AutoPauseNativeVideo";
