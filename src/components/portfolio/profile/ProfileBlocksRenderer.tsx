import { useState, useEffect } from 'react';
import { ProfileBlock } from '@/hooks/usePortfolioPermissions';
import { usePortfolioPermissions } from '@/hooks/usePortfolioPermissions';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Play, Image as ImageIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ProfileBlocksRendererProps {
  blocks: ProfileBlock[];
  userId: string;
  isOwner: boolean;
  editMode?: boolean;
}

export default function ProfileBlocksRenderer({
  blocks,
  userId,
  isOwner,
  editMode = false,
}: ProfileBlocksRendererProps) {
  const { canViewBlock } = usePortfolioPermissions();

  const visibleBlocks = blocks
    .filter(block => canViewBlock(block, isOwner, userId))
    .sort((a, b) => a.order - b.order);

  if (visibleBlocks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay contenido para mostrar
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {visibleBlocks.map(block => (
        <BlockRenderer 
          key={block.key} 
          block={block} 
          userId={userId}
          editMode={editMode}
        />
      ))}
    </div>
  );
}

function BlockRenderer({ 
  block, 
  userId,
  editMode 
}: { 
  block: ProfileBlock; 
  userId: string;
  editMode: boolean;
}) {
  const renderBlockContent = () => {
    switch (block.key) {
      case 'portfolio_grid':
        return <PortfolioGridBlock userId={userId} />;
      case 'hero':
      case 'highlights':
      case 'skills':
      case 'certifications':
      case 'testimonials':
      case 'public_stats':
      case 'collections':
        return (
          <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
            {block.label} - En desarrollo
          </div>
        );
      default:
        if (block.is_internal) {
          return (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
              <span className="text-yellow-600">[Admin] {block.label}</span>
            </div>
          );
        }
        return null;
    }
  };

  return (
    <section className={cn(editMode && "ring-2 ring-primary/20 ring-offset-2 rounded-lg")}>
      {renderBlockContent()}
    </section>
  );
}

interface Post {
  id: string;
  media_url: string;
  media_type: string;
  thumbnail_url: string | null;
  views_count: number | null;
  likes_count: number | null;
}

function PortfolioGridBlock({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('portfolio_posts')
        .select('id, media_url, media_type, thumbnail_url, views_count, likes_count')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPosts(data);
      }
      setLoading(false);
    };

    fetchPosts();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No hay publicaciones aún</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {posts.map(post => (
        <div
          key={post.id}
          className="aspect-square relative group cursor-pointer overflow-hidden rounded-sm bg-muted"
        >
          {post.media_type === 'video' ? (
            <>
              <img
                src={post.thumbnail_url || '/placeholder.svg'}
                alt="Post"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2">
                <Play className="h-4 w-4 text-white drop-shadow-lg" />
              </div>
            </>
          ) : (
            <img
              src={post.media_url}
              alt="Post"
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
            {(post.likes_count ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-sm font-semibold">
                ❤️ {post.likes_count}
              </span>
            )}
            {(post.views_count ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-sm font-semibold">
                👁 {post.views_count}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
