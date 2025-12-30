import { useState, useRef } from 'react';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Flag, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ShareDialog } from '@/components/portfolio/ShareDialog';
import { ReportDialog } from '@/components/portfolio/ReportDialog';
import { useNavigate } from 'react-router-dom';
import { ShareButton } from '@/components/social/ShareButton';

interface FeedItem {
  id: string;
  type: 'work' | 'post';
  title?: string;
  caption?: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url?: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  client_name?: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_liked?: boolean;
  is_saved?: boolean;
}

interface FeedCardProps {
  item: FeedItem;
  onSave: () => void;
  isSaved?: boolean;
  onOpenComments?: () => void;
}

// Helper to parse hashtags and make them clickable
function ParsedCaption({ text, onHashtagClick }: { text: string; onHashtagClick: (tag: string) => void }) {
  const parts = text.split(/(#\w+)/g);
  
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('#')) {
          const tag = part.slice(1);
          return (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                onHashtagClick(tag);
              }}
              className="text-primary hover:underline font-medium transition-colors"
            >
              {part}
            </button>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

// Floating hearts animation component
function FloatingHearts({ show }: { show: boolean }) {
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <Heart
          key={i}
          className={cn(
            "absolute h-8 w-8 fill-reaction-heart text-reaction-heart animate-bounce-heart",
            i % 2 === 0 ? "animate-wiggle" : ""
          )}
          style={{
            animationDelay: `${i * 100}ms`,
            left: `${30 + Math.random() * 40}%`,
            top: `${30 + Math.random() * 40}%`,
          }}
        />
      ))}
    </div>
  );
}

export default function FeedCard({ item, onSave, isSaved, onOpenComments }: FeedCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLiked, setIsLiked] = useState(item.is_liked || false);
  const [likesCount, setLikesCount] = useState(item.likes_count);
  const [isLiking, setIsLiking] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [showHearts, setShowHearts] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const handleLike = async () => {
    if (!user || isLiking) return;
    
    setIsLiking(true);
    const wasLiked = isLiked;
    
    // Show floating hearts animation
    if (!wasLiked) {
      setShowHearts(true);
      setTimeout(() => setShowHearts(false), 1000);
    }
    
    // Optimistic update
    setIsLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);
    
    try {
      if (wasLiked) {
        await (supabase as any)
          .from('portfolio_post_likes')
          .delete()
          .eq('post_id', item.id)
          .eq('user_id', user.id);
      } else {
        await (supabase as any)
          .from('portfolio_post_likes')
          .insert({
            post_id: item.id,
            user_id: user.id
          });
      }
    } catch (error) {
      setIsLiked(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
      toast.error('Error al procesar like');
    } finally {
      setIsLiking(false);
    }
  };

  const handleDoubleClick = () => {
    if (!isLiked) {
      handleLike();
    } else {
      setShowHearts(true);
      setTimeout(() => setShowHearts(false), 1000);
    }
  };

  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleHashtagClick = (tag: string) => {
    navigate(`/social/explore?tab=hashtags&tag=${encodeURIComponent(tag)}`);
  };

  const handleUserClick = () => {
    if (item.user_id) {
      navigate(`/profile/${item.user_id}`);
    }
  };

  const shareUrl = `${window.location.origin}/social#post-${item.id}`;
  const shareTitle = item.title || item.caption || 'Mira este post';

  return (
    <article className="glass-card rounded-2xl overflow-hidden border border-white/10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <Avatar 
          className="h-11 w-11 cursor-pointer ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-transform hover:scale-105" 
          onClick={handleUserClick}
        >
          <AvatarImage src={item.user_avatar} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {item.user_name?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div 
            className="font-semibold truncate cursor-pointer hover:text-primary transition-colors"
            onClick={handleUserClick}
          >
            {item.user_name}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
          </div>
        </div>
        {item.client_name && (
          <Badge variant="secondary" className="text-xs glass-card border border-white/10">
            {item.client_name}
          </Badge>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-white/10">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-card border-white/10">
            <DropdownMenuItem onClick={() => setReportOpen(true)} className="cursor-pointer">
              <Flag className="h-4 w-4 mr-2" />
              Reportar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Media */}
      <div 
        className="relative aspect-square bg-black/20 overflow-hidden cursor-pointer"
        onDoubleClick={handleDoubleClick}
      >
        {item.media_type === 'video' ? (
          <>
            <video
              ref={videoRef}
              src={item.media_url}
              poster={item.thumbnail_url}
              className="w-full h-full object-cover"
              muted={isMuted}
              loop
              playsInline
              onClick={toggleVideoPlay}
            />
            {/* Video controls overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {!isPlaying && (
                <div className="glass-card p-4 rounded-full animate-pulse">
                  <Play className="h-8 w-8 text-white fill-white" />
                </div>
              )}
            </div>
            {/* Mute button */}
            <button
              onClick={toggleMute}
              className="absolute bottom-4 right-4 glass-card p-2 rounded-full hover:scale-110 transition-transform"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-white" />
              ) : (
                <Volume2 className="h-4 w-4 text-white" />
              )}
            </button>
          </>
        ) : (
          <img
            src={item.media_url}
            alt={item.title || item.caption || 'Post'}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
        )}
        
        {/* Floating hearts */}
        <FloatingHearts show={showHearts} />
      </div>

      {/* Actions */}
      <div className="p-4">
        <div className="flex items-center gap-1 mb-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-10 w-10 rounded-full transition-all duration-200",
              isLiked && "text-reaction-heart hover:text-reaction-heart"
            )}
            onClick={handleLike}
            disabled={isLiking}
          >
            <Heart className={cn(
              "h-6 w-6 transition-all duration-200",
              isLiked && "fill-reaction-heart scale-110 animate-bounce-heart"
            )} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-full"
            onClick={onOpenComments}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          
          <ShareButton
            url={shareUrl}
            title={shareTitle}
          />
          
          <div className="flex-1" />
          
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-10 w-10 rounded-full transition-all duration-200",
              isSaved && "text-reaction-save"
            )}
            onClick={onSave}
          >
            <Bookmark className={cn(
              "h-6 w-6 transition-all",
              isSaved && "fill-reaction-save"
            )} />
          </Button>
        </div>

        {likesCount > 0 && (
          <div className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 fill-reaction-heart text-reaction-heart" />
            {likesCount} me gusta
          </div>
        )}

        {(item.title || item.caption) && (
          <p className="text-sm leading-relaxed">
            <span 
              className="font-semibold mr-1.5 cursor-pointer hover:text-primary transition-colors"
              onClick={handleUserClick}
            >
              {item.user_name}
            </span>
            <ParsedCaption 
              text={item.title || item.caption || ''} 
              onHashtagClick={handleHashtagClick}
            />
          </p>
        )}

        {item.comments_count > 0 && (
          <button 
            className="text-sm text-muted-foreground mt-2 hover:text-foreground transition-colors"
            onClick={onOpenComments}
          >
            Ver los {item.comments_count} comentarios
          </button>
        )}
      </div>

      {/* Dialogs */}
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={shareUrl}
        title={shareTitle}
      />

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        contentId={item.id}
        contentType={item.type === 'post' ? 'post' : 'content'}
      />
    </article>
  );
}
