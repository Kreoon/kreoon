import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';
import { PostComments } from './PostComments';
import { useAuth } from '@/hooks/useAuth';
import {
  useSpaceCategories,
  useSpaceFeed,
} from '@/hooks/academy/useAcademyCommunity';

interface SpaceFeedProps {
  spaceId: string;
  ownerId: string;
  accentColor?: string;
}

export function SpaceFeed({ spaceId, ownerId, accentColor = '#8B5CF6' }: SpaceFeedProps) {
  const { user } = useAuth();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const { data: categories = [] } = useSpaceCategories(spaceId);
  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useSpaceFeed(spaceId, categoryId);

  const isOwner = !!user && user.id === ownerId;
  const posts = data?.pages.flat() ?? [];

  // Scroll infinito (intersection observer básico)
  useEffect(() => {
    const handler = () => {
      if (!hasNextPage || isFetchingNextPage) return;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      if (scrollTop + winHeight >= docHeight - 600) fetchNextPage();
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  function toggleComments(postId: string) {
    setExpandedComments((s) => {
      const next = new Set(s);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
      {/* Sidebar categorías (desktop) */}
      <aside className="hidden md:block">
        <div className="space-y-1 sticky top-20">
          <button
            onClick={() => setCategoryId(null)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
              categoryId === null ? 'bg-white/10 text-zinc-100' : 'text-zinc-400 hover:bg-white/5'
            )}
          >
            📰 Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                categoryId === c.id ? 'bg-white/10 text-zinc-100' : 'text-zinc-400 hover:bg-white/5'
              )}
            >
              <span className="mr-2">{c.emoji}</span>
              {c.name}
            </button>
          ))}
        </div>
      </aside>

      {/* Feed */}
      <div>
        {/* Tabs móviles */}
        <div className="md:hidden flex gap-2 overflow-x-auto mb-4 scrollbar-hide">
          <button
            onClick={() => setCategoryId(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs whitespace-nowrap border',
              categoryId === null
                ? 'border-purple-500 text-zinc-100 bg-purple-500/10'
                : 'border-white/10 text-zinc-500'
            )}
          >
            📰 Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs whitespace-nowrap border',
                categoryId === c.id
                  ? 'border-purple-500 text-zinc-100 bg-purple-500/10'
                  : 'border-white/10 text-zinc-500'
              )}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>

        {/* Composer */}
        {user && (
          <PostComposer spaceId={spaceId} categories={categories} accentColor={accentColor} />
        )}

        {/* Posts */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando feed...
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            Aún no hay posts en esta categoría. ¡Sé el primero!
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id}>
                <PostCard
                  post={post}
                  spaceId={spaceId}
                  currentUserId={user?.id ?? null}
                  isOwner={isOwner}
                  accentColor={accentColor}
                  onCommentClick={toggleComments}
                />
                {expandedComments.has(post.id) && (
                  <div className="mt-2 mb-4 pl-4 pr-2">
                    <PostComments postId={post.id} accentColor={accentColor} />
                  </div>
                )}
              </div>
            ))}

            {hasNextPage && (
              <div className="text-center py-4">
                <Button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  variant="outline"
                >
                  {isFetchingNextPage ? 'Cargando...' : 'Cargar más'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
