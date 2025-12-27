import { Play } from 'lucide-react';

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
}

interface FeedGridCardProps {
  item: FeedItem;
  onClick: () => void;
}

export default function FeedGridCard({ item, onClick }: FeedGridCardProps) {
  return (
    <div
      className="aspect-square relative group cursor-pointer overflow-hidden bg-muted"
      onClick={onClick}
    >
      {item.media_type === 'video' ? (
        <>
          <img
            src={item.thumbnail_url || '/placeholder.svg'}
            alt={item.title || item.caption || 'Post'}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute top-2 right-2">
            <Play className="h-5 w-5 text-white drop-shadow-lg fill-white/30" />
          </div>
        </>
      ) : (
        <img
          src={item.media_url}
          alt={item.title || item.caption || 'Post'}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
        {item.likes_count > 0 && (
          <span className="flex items-center gap-1 text-sm font-semibold">
            ❤️ {item.likes_count}
          </span>
        )}
        {item.comments_count > 0 && (
          <span className="flex items-center gap-1 text-sm font-semibold">
            💬 {item.comments_count}
          </span>
        )}
        {item.views_count > 0 && !item.likes_count && !item.comments_count && (
          <span className="flex items-center gap-1 text-sm font-semibold">
            👁 {item.views_count}
          </span>
        )}
      </div>
    </div>
  );
}