import { useEffect, useRef, useState, forwardRef } from "react";

interface AutoPauseVideoProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  index?: number;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

export const AutoPauseVideo = forwardRef<HTMLDivElement, AutoPauseVideoProps>(
  ({ src, className, style, index = 0, autoPlay = true, muted = true, loop = true }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [iframeSrc, setIframeSrc] = useState<string | null>(null);

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
            <div className="w-full h-full flex items-center justify-center bg-muted/50 text-muted-foreground">
              <div className="text-center">
                <div className="animate-pulse text-2xl">▶</div>
                <p className="text-xs mt-1">Scroll para ver</p>
              </div>
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
      <div ref={setRefs} className={className} style={style}>
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain"
          controls
          playsInline
          muted={muted}
          loop={loop}
        />
      </div>
    );
  }
);

AutoPauseNativeVideo.displayName = "AutoPauseNativeVideo";
