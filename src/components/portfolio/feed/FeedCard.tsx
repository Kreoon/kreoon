import { useState } from 'react';
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, Flag } from 'lucide-react';
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
              className="text-primary hover:underline font-medium"
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

export default function FeedCard({ item, onSave, isSaved, onOpenComments }: FeedCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(item.is_liked || false);
  const [likesCount, setLikesCount] = useState(item.likes_count);
  const [isLiking, setIsLiking] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const handleLike = async () => {
    if (!user || isLiking) return;
    
    setIsLiking(true);
    const wasLiked = isLiked;
    
    // Optimistic update
    setIsLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);
    
    try {
      if (wasLiked) {
        // Unlike
        await (supabase as any)
          .from('portfolio_post_likes')
          .delete()
          .eq('post_id', item.id)
          .eq('user_id', user.id);
      } else {
        // Like - this will trigger the notification via database trigger
        await (supabase as any)
          .from('portfolio_post_likes')
          .insert({
            post_id: item.id,
            user_id: user.id
          });
      }
    } catch (error) {
      // Revert on error
      setIsLiked(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
      toast.error('Error al procesar like');
    } finally {
      setIsLiking(false);
    }
  };

  const handleHashtagClick = (tag: string) => {
    navigate(`/explore?tab=hashtags&tag=${encodeURIComponent(tag)}`);
  };

  const handleUserClick = () => {
    if (item.user_id) {
      navigate(`/profile/${item.user_id}`);
    }
  };

  const shareUrl = `${window.location.origin}/social#post-${item.id}`;
  const shareTitle = item.title || item.caption || 'Mira este post';

  return (
    <article className="bg-card rounded-xl overflow-hidden border border-border">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <Avatar 
          className="h-10 w-10 cursor-pointer" 
          onClick={handleUserClick}
        >
          <AvatarImage src={item.user_avatar} />
          <AvatarFallback>{item.user_name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div 
            className="font-medium truncate cursor-pointer hover:underline"
            onClick={handleUserClick}
          >
            {item.user_name}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
          </div>
        </div>
        {item.client_name && (
          <Badge variant="secondary" className="text-xs">{item.client_name}</Badge>
        )}
        
        {/* More options menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setReportOpen(true)}>
              <Flag className="h-4 w-4 mr-2" />
              Reportar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Media */}
      <div className="relative aspect-square bg-muted">
        {item.media_type === 'video' ? (
          <video
            src={item.media_url}
            poster={item.thumbnail_url}
            controls
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={item.media_url}
            alt={item.title || item.caption || 'Post'}
            className="w-full h-full object-cover"
            onDoubleClick={handleLike}
          />
        )}
      </div>

      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            onClick={handleLike}
            disabled={isLiking}
          >
            <Heart className={cn(
              "h-5 w-5 transition-colors",
              isLiked && "fill-red-500 text-red-500"
            )} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            onClick={onOpenComments}
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            onClick={onSave}
          >
            <Bookmark className={cn("h-5 w-5", isSaved && "fill-current text-yellow-500")} />
          </Button>
        </div>

        {likesCount > 0 && (
          <div className="text-sm font-medium mb-1">{likesCount} me gusta</div>
        )}

        {(item.title || item.caption) && (
          <p className="text-sm">
            <span 
              className="font-medium mr-1 cursor-pointer hover:underline"
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
            className="text-sm text-muted-foreground mt-1 hover:underline"
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
