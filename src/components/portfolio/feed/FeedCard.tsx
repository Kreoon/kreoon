import { Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

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
}

export default function FeedCard({ item, onSave, isSaved }: FeedCardProps) {
  return (
    <article className="bg-card rounded-xl overflow-hidden border border-border">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={item.user_avatar} />
          <AvatarFallback>{item.user_name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{item.user_name}</div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
          </div>
        </div>
        {item.client_name && (
          <Badge variant="secondary" className="text-xs">{item.client_name}</Badge>
        )}
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
          />
        )}
      </div>

      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Heart className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MessageCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
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

        {item.likes_count > 0 && (
          <div className="text-sm font-medium mb-1">{item.likes_count} me gusta</div>
        )}

        {(item.title || item.caption) && (
          <p className="text-sm">
            <span className="font-medium mr-1">{item.user_name}</span>
            {item.title || item.caption}
          </p>
        )}
      </div>
    </article>
  );
}
