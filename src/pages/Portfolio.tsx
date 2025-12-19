import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Share2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface PublishedContent {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  client: { name: string; logo_url: string | null } | null;
  creator: { full_name: string; avatar_url: string | null } | null;
  created_at: string;
}

export default function Portfolio() {
  const [content, setContent] = useState<PublishedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchPublishedContent();
  }, []);

  const fetchPublishedContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select(`
          id,
          title,
          video_url,
          thumbnail_url,
          created_at,
          creator_id,
          client_id
        `)
        .eq('is_published', true)
        .not('video_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Fetch related data separately
        const clientIds = [...new Set(data.filter(d => d.client_id).map(d => d.client_id))] as string[];
        const creatorIds = [...new Set(data.filter(d => d.creator_id).map(d => d.creator_id))] as string[];

        const [clientsResult, creatorsResult] = await Promise.all([
          clientIds.length > 0 
            ? supabase.from('clients').select('id, name, logo_url').in('id', clientIds)
            : Promise.resolve({ data: [] }),
          creatorIds.length > 0 
            ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', creatorIds)
            : Promise.resolve({ data: [] })
        ]);

        const clientsMap = new Map((clientsResult.data || []).map(c => [c.id, c]));
        const creatorsMap = new Map((creatorsResult.data || []).map(c => [c.id, c]));

        const enrichedData = data.map(item => ({
          id: item.id,
          title: item.title,
          video_url: item.video_url,
          thumbnail_url: item.thumbnail_url,
          created_at: item.created_at,
          client: item.client_id ? clientsMap.get(item.client_id) || null : null,
          creator: item.creator_id ? creatorsMap.get(item.creator_id) || null : null
        }));

        setContent(enrichedData as PublishedContent[]);
      } else {
        setContent([]);
      }
    } catch (error) {
      console.error('Error fetching published content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < content.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        handleNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, content.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-full max-w-md aspect-[9/16]">
          <Skeleton className="w-full h-full rounded-none bg-muted/20" />
        </div>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">No hay contenido publicado</h2>
          <p className="text-white/60">Próximamente verás aquí nuestro portafolio</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      {/* Mobile-first vertical feed */}
      <div className="h-screen w-full flex items-center justify-center">
        <div className="relative w-full max-w-md h-full md:h-[90vh] md:max-h-[800px]">
          {/* Video Container */}
          <div className="relative w-full h-full">
            {content.map((item, index) => (
              <VideoCard
                key={item.id}
                content={item}
                isActive={index === currentIndex}
                style={{
                  transform: `translateY(${(index - currentIndex) * 100}%)`,
                  transition: 'transform 0.3s ease-out',
                }}
              />
            ))}
          </div>

          {/* Navigation Arrows - Desktop */}
          <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-2 z-20">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="bg-white/10 hover:bg-white/20 text-white rounded-full h-10 w-10"
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={currentIndex === content.length - 1}
              className="bg-white/10 hover:bg-white/20 text-white rounded-full h-10 w-10"
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 z-20">
            {content.map((_, index) => (
              <div
                key={index}
                className={`h-1 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'w-6 bg-white' 
                    : 'w-2 bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="fixed top-4 left-4 z-30">
        <h1 className="text-white font-bold text-lg">Content Studio</h1>
        <p className="text-white/60 text-xs">Portafolio</p>
      </div>
    </div>
  );
}

interface VideoCardProps {
  content: PublishedContent;
  isActive: boolean;
  style?: React.CSSProperties;
}

function VideoCard({ content, isActive, style }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Handle touch to show/hide controls
  const handleTap = () => {
    setShowControls(!showControls);
    togglePlay();
  };

  // Parse video embed or direct URL
  const getVideoSrc = () => {
    const url = content.video_url;
    
    // Direct video files
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return url;
    }
    
    // For embedded content, we'll show a thumbnail with play overlay
    return null;
  };

  const videoSrc = getVideoSrc();
  const isEmbedded = !videoSrc;

  return (
    <div 
      className="absolute inset-0 w-full h-full"
      style={style}
    >
      {videoSrc ? (
        // Direct video player
        <div className="relative w-full h-full bg-black" onClick={handleTap}>
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-cover"
            loop
            muted={isMuted}
            playsInline
            poster={content.thumbnail_url || undefined}
          />
          
          {/* Play/Pause Overlay */}
          {showControls && !isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm">
                <Play className="h-12 w-12 text-white" fill="white" />
              </div>
            </div>
          )}
        </div>
      ) : (
        // Embedded content (Instagram, TikTok, YouTube)
        <div className="relative w-full h-full bg-black">
          <EmbeddedVideo url={content.video_url} />
        </div>
      )}

      {/* Action Buttons - Right Side */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
        {/* Creator Avatar */}
        {content.creator && (
          <div className="relative">
            {content.creator.avatar_url ? (
              <img 
                src={content.creator.avatar_url} 
                alt={content.creator.full_name}
                className="w-12 h-12 rounded-full border-2 border-white object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full border-2 border-white bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold">
                {content.creator.full_name.charAt(0)}
              </div>
            )}
          </div>
        )}

        {/* Like Button */}
        <button className="flex flex-col items-center gap-1 text-white">
          <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition">
            <Heart className="h-6 w-6" />
          </div>
          <span className="text-xs">Like</span>
        </button>

        {/* Comment Button */}
        <button className="flex flex-col items-center gap-1 text-white">
          <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition">
            <MessageCircle className="h-6 w-6" />
          </div>
          <span className="text-xs">Info</span>
        </button>

        {/* Share Button */}
        <button className="flex flex-col items-center gap-1 text-white">
          <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition">
            <Share2 className="h-6 w-6" />
          </div>
          <span className="text-xs">Share</span>
        </button>

        {/* Mute Button */}
        {videoSrc && (
          <button 
            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
            className="flex flex-col items-center gap-1 text-white"
          >
            <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition">
              {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
            </div>
            <span className="text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
        )}
      </div>

      {/* Content Info - Bottom */}
      <div className="absolute bottom-0 left-0 right-16 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10">
        {/* Client/Brand */}
        {content.client && (
          <div className="flex items-center gap-2 mb-2">
            {content.client.logo_url ? (
              <img 
                src={content.client.logo_url} 
                alt={content.client.name}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                {content.client.name.charAt(0)}
              </div>
            )}
            <span className="text-white font-medium text-sm">{content.client.name}</span>
          </div>
        )}

        {/* Title */}
        <h3 className="text-white font-semibold text-base mb-1 line-clamp-2">
          {content.title}
        </h3>

        {/* Creator */}
        {content.creator && (
          <p className="text-white/70 text-sm">
            Creado por @{content.creator.full_name.toLowerCase().replace(/\s+/g, '')}
          </p>
        )}
      </div>
    </div>
  );
}

// Component for embedded videos
function EmbeddedVideo({ url }: { url: string }) {
  // TikTok
  if (url.includes('tiktok.com')) {
    const videoId = url.match(/video\/(\d+)/)?.[1];
    if (videoId) {
      return (
        <iframe
          src={`https://www.tiktok.com/embed/v2/${videoId}`}
          className="w-full h-full"
          allowFullScreen
        />
      );
    }
  }

  // Instagram
  if (url.includes('instagram.com')) {
    let cleanUrl = url.split('?')[0].replace(/\/$/, '');
    const embedUrl = cleanUrl + '/embed/captioned';
    return (
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allowFullScreen
        scrolling="no"
        frameBorder="0"
      />
    );
  }

  // YouTube Shorts
  if (url.includes('/shorts/')) {
    const embedUrl = url.replace('/shorts/', '/embed/');
    return (
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    );
  }

  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let embedUrl = url;
    if (url.includes('watch?v=')) {
      embedUrl = url.replace('watch?v=', 'embed/');
    } else if (url.includes('youtu.be/')) {
      embedUrl = url.replace('youtu.be/', 'youtube.com/embed/');
    }
    return (
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    );
  }

  // Fallback - show link
  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-white hover:underline flex items-center gap-2"
      >
        <Play className="h-8 w-8" />
        Ver video
      </a>
    </div>
  );
}
