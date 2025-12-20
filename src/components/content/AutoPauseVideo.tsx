import { useEffect, useRef, useState } from "react";

interface AutoPauseVideoProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  index: number;
}

export function AutoPauseVideo({ src, className, style, index }: AutoPauseVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
          setIsVisible(visible);
          
          if (visible) {
            // Load iframe when visible
            setIframeSrc(src);
          } else {
            // Unload iframe when not visible to stop playback
            // This is the most reliable way to stop Bunny embeds
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
  }, [src]);

  // For Bunny Stream embeds, use iframe unloading strategy
  const isBunnyEmbed = src.includes('iframe.mediadelivery.net') || src.includes('bunny');
  
  if (isBunnyEmbed) {
    return (
      <div ref={containerRef} className={className} style={style}>
        {iframeSrc ? (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            loading="lazy"
            className="w-full h-full border-0"
            style={{ aspectRatio: '9/16' }}
            allow="accelerometer; gyroscope; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/50 text-muted-foreground">
            <div className="text-center">
              <div className="animate-pulse">▶</div>
              <p className="text-xs mt-1">Scroll para ver</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // For direct video files, use native video element controls
  if (src.match(/\.(mp4|webm|ogg)$/i)) {
    return (
      <AutoPauseNativeVideo 
        src={src} 
        className={className} 
        style={style}
      />
    );
  }

  // For other embeds (YouTube, TikTok, etc.), just render normally
  return (
    <div ref={containerRef} className={className} style={style}>
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

// Separate component for native video elements with pause control
function AutoPauseNativeVideo({ src, className, style }: { 
  src: string; 
  className?: string; 
  style?: React.CSSProperties;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (videoRef.current) {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
              // Video is visible - don't auto-play, but allow playback
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
  }, []);

  return (
    <div ref={containerRef} className={className} style={style}>
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        controls
        playsInline
      />
    </div>
  );
}
