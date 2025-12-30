import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, Users, Eye, Volume2, VolumeX, Maximize2, ExternalLink } from 'lucide-react';
import { useStreamingRealtime } from '../hooks/useStreamingRealtime';
import type { StreamingEvent } from '@/hooks/useLiveStreaming';
import Hls from 'hls.js';

interface StreamPlayerProps {
  event: StreamingEvent;
  streamUrl?: string;
  compact?: boolean;
  autoPlay?: boolean;
}

export function StreamPlayer({ event, streamUrl, compact = false, autoPlay = false }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { metrics, isLive } = useStreamingRealtime(event.id);

  // Initialize HLS player if streamUrl is HLS
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    const video = videoRef.current;

    if (streamUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) {
            video.play().catch(() => setHasError(true));
          }
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            setHasError(true);
          }
        });

        return () => {
          hls.destroy();
        };
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        if (autoPlay) {
          video.play().catch(() => setHasError(true));
        }
      }
    } else if (streamUrl.includes('rtmp://') || streamUrl.includes('rtmps://')) {
      // RTMP requires a separate player or transcoding service
      setHasError(true);
    } else {
      // Regular video URL
      video.src = streamUrl;
      if (autoPlay) {
        video.play().catch(() => setHasError(true));
      }
    }
  }, [streamUrl, autoPlay]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  if (compact) {
    return (
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
        {isLive && (
          <Badge variant="destructive" className="absolute top-2 left-2 z-10 gap-1">
            <Radio className="h-3 w-3" />
            EN VIVO
          </Badge>
        )}
        {streamUrl && !hasError ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted={isMuted}
            playsInline
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <div className="text-center">
              <Radio className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {hasError ? 'Error al cargar stream' : 'Stream no disponible'}
              </p>
            </div>
          </div>
        )}
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {metrics.currentViewers}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {isLive && (
              <Badge variant="destructive" className="gap-1">
                <Radio className="h-3 w-3 animate-pulse" />
                EN VIVO
              </Badge>
            )}
            {event.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {metrics.currentViewers}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Eye className="h-3 w-3" />
              {metrics.totalViews}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative rounded-lg overflow-hidden bg-black aspect-video mb-4">
          {streamUrl && !hasError ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted={isMuted}
              playsInline
              onClick={togglePlay}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <div className="text-center">
                <Radio className="h-16 w-16 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-2">
                  {hasError ? 'Error al cargar el stream' : 'Stream no disponible'}
                </p>
                {event.rtmp_url && (
                  <p className="text-xs text-muted-foreground">
                    RTMP: {event.rtmp_url}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Controls overlay */}
          {streamUrl && !hasError && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/20">
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
                    <Maximize2 className="h-5 w-5" />
                  </Button>
                  {event.rtmp_url && (
                    <Button variant="ghost" size="icon" asChild className="text-white hover:bg-white/20">
                      <a href={event.rtmp_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Event info */}
        {event.description && (
          <p className="text-sm text-muted-foreground">{event.description}</p>
        )}
      </CardContent>
    </Card>
  );
}
