import { useMemo, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PlatformIcon } from '../common/PlatformIcon';
import { PLATFORMS } from '../../config';
import { Heart, MessageCircle, Send, Bookmark, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import type { SocialPlatform, SocialPostType } from '../../types/social.types';

interface PreviewPanelProps {
  caption: string;
  hashtags: string[];
  mediaUrls: string[];
  thumbnailUrl: string | null;
  platforms: SocialPlatform[];
  postType: SocialPostType;
  username?: string;
}

const isVideoUrl = (url: string) =>
  /\.(mp4|mov|webm|avi|m4v|mkv)/i.test(url) ||
  /b-cdn\.net\/[a-f0-9-]+\/play_/i.test(url) ||
  /mediadelivery\.net/i.test(url);

function VideoPlayer({ src, aspectClass }: { src: string; aspectClass: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className={cn('relative bg-black group', aspectClass)}>
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        muted={muted}
        playsInline
        loop
        preload="metadata"
        onEnded={() => setPlaying(false)}
        onClick={togglePlay}
      />
      {/* Play/Pause overlay */}
      <button
        onClick={togglePlay}
        className={cn(
          'absolute inset-0 flex items-center justify-center transition-opacity',
          playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
        )}
      >
        <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
          {playing ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" />
          )}
        </div>
      </button>
      {/* Mute toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
        className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {muted ? (
          <VolumeX className="w-3.5 h-3.5 text-white" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 text-white" />
        )}
      </button>
    </div>
  );
}

function CarouselPreview({ mediaUrls, aspectClass }: { mediaUrls: string[]; aspectClass: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goTo = (idx: number) => {
    if (idx >= 0 && idx < mediaUrls.length) setCurrentIndex(idx);
  };

  const currentUrl = mediaUrls[currentIndex];

  return (
    <div className={cn('relative bg-black group', aspectClass)}>
      {isVideoUrl(currentUrl) ? (
        <VideoPlayer src={currentUrl} aspectClass="w-full h-full" />
      ) : (
        <img src={currentUrl} alt="" className="w-full h-full object-contain" />
      )}

      {/* Navigation arrows */}
      {mediaUrls.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button
              onClick={() => goTo(currentIndex - 1)}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {currentIndex < mediaUrls.length - 1 && (
            <button
              onClick={() => goTo(currentIndex + 1)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </>
      )}

      {/* Counter badge */}
      {mediaUrls.length > 1 && (
        <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
          {currentIndex + 1}/{mediaUrls.length}
        </div>
      )}

      {/* Dots */}
      {mediaUrls.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {mediaUrls.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-all',
                idx === currentIndex ? 'bg-white w-3' : 'bg-white/50'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PreviewPanel({
  caption,
  hashtags,
  mediaUrls,
  thumbnailUrl,
  platforms,
  postType,
  username = 'tu_cuenta',
}: PreviewPanelProps) {
  const fullCaption = useMemo(() => {
    const hashtagStr = hashtags.length > 0 ? '\n\n' + hashtags.map(t => `#${t}`).join(' ') : '';
    return caption + hashtagStr;
  }, [caption, hashtags]);

  const activePlatform = platforms[0] || 'instagram';
  const isReel = postType === 'reel' || postType === 'short';
  const isStory = postType === 'story';
  const isCarousel = postType === 'carousel' || mediaUrls.length > 1;
  const isVertical = isReel || isStory;

  // Determine aspect ratio class
  const aspectClass = isVertical ? 'aspect-[9/16]' : 'aspect-square';

  // For reels/stories use vertical wrapper
  const containerMaxWidth = isVertical ? 'max-w-[220px]' : '';

  const hasMedia = thumbnailUrl || mediaUrls.length > 0;
  const firstMediaUrl = mediaUrls[0] || thumbnailUrl;
  const firstIsVideo = firstMediaUrl ? isVideoUrl(firstMediaUrl) : false;

  return (
    <Card className="bg-muted/20 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlatformIcon platform={activePlatform} size="xs" />
            <CardTitle className="text-xs text-muted-foreground">
              Vista previa - {PLATFORMS[activePlatform]?.name || activePlatform}
            </CardTitle>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
            {postType === 'reel' ? 'Reel' : postType === 'short' ? 'Short' : postType === 'story' ? 'Historia' : isCarousel ? 'Carrusel' : 'Post'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={cn('mx-auto', containerMaxWidth)}>
          {/* Mock post layout */}
          <div className="bg-card rounded-sm overflow-hidden border">
            {/* Header */}
            <div className="flex items-center gap-2 p-2.5 border-b">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold truncate">@{username}</p>
                {isReel && <p className="text-[9px] text-muted-foreground">Reel</p>}
                {isStory && <p className="text-[9px] text-muted-foreground">Historia</p>}
              </div>
            </div>

            {/* Media area */}
            {hasMedia && (
              <>
                {isCarousel && mediaUrls.length > 1 ? (
                  <CarouselPreview mediaUrls={mediaUrls} aspectClass={aspectClass} />
                ) : firstMediaUrl && firstIsVideo ? (
                  <VideoPlayer src={firstMediaUrl} aspectClass={aspectClass} />
                ) : firstMediaUrl ? (
                  <div className={cn('relative bg-muted overflow-hidden', aspectClass)}>
                    <img
                      src={firstMediaUrl}
                      alt=""
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : null}
              </>
            )}

            {/* No media placeholder */}
            {!hasMedia && (
              <div className={cn('bg-muted/30 flex items-center justify-center', aspectClass)}>
                <p className="text-xs text-muted-foreground">Sin media</p>
              </div>
            )}

            {/* Engagement bar (Instagram/Facebook style) */}
            {!isStory && (
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-3">
                  <Heart className="w-4 h-4 text-muted-foreground" />
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  <Send className="w-4 h-4 text-muted-foreground" />
                </div>
                <Bookmark className="w-4 h-4 text-muted-foreground" />
              </div>
            )}

            {/* Caption */}
            {!isStory && fullCaption.trim() && (
              <div className="px-3 pb-2">
                <p className="text-[11px] whitespace-pre-wrap break-words leading-relaxed">
                  <span className="font-semibold">@{username}</span>{' '}
                  {fullCaption.length > 200
                    ? fullCaption.slice(0, 200) + '...'
                    : fullCaption}
                </p>
              </div>
            )}

            {/* Character count per platform */}
            <div className="px-3 pb-2 flex flex-wrap gap-1">
              {platforms.map(p => {
                const config = PLATFORMS[p];
                if (!config) return null;
                const over = fullCaption.length > config.maxCaptionLength;
                return (
                  <span
                    key={p}
                    className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded-full',
                      over ? 'bg-red-500/20 text-red-400' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {config.name}: {fullCaption.length}/{config.maxCaptionLength}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
