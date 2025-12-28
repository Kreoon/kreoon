import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Hash, TrendingUp, Users, Grid3X3, Loader2 } from 'lucide-react';
import { useHashtags } from '@/hooks/useHashtags';

interface TrendingCreator {
  id: string;
  full_name: string;
  avatar_url: string | null;
  username: string | null;
  bio: string | null;
}

interface TrendingPost {
  id: string;
  media_url: string;
  media_type: string;
  likes_count: number;
  views_count: number;
  user_id: string;
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'trending';
  const hashtagFilter = searchParams.get('tag');

  const [searchQuery, setSearchQuery] = useState('');
  const [trendingCreators, setTrendingCreators] = useState<TrendingCreator[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [hashtagPosts, setHashtagPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { trending: trendingHashtags, fetchTrending, getPostsByHashtag } = useHashtags();

  useEffect(() => {
    fetchTrending(20);
    fetchTrendingData();
  }, []);

  useEffect(() => {
    if (hashtagFilter) {
      loadHashtagPosts(hashtagFilter);
    }
  }, [hashtagFilter]);

  const fetchTrendingData = async () => {
    setLoading(true);
    try {
      // Fetch trending creators
      const { data: creators } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, avatar_url, username, bio')
        .eq('is_public', true)
        .limit(12);

      // Fetch trending posts
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: posts } = await (supabase as any)
        .from('portfolio_posts')
        .select('id, media_url, media_type, likes_count, views_count, user_id')
        .eq('visibility', 'public')
        .gte('created_at', weekAgo.toISOString())
        .order('likes_count', { ascending: false })
        .limit(24);

      setTrendingCreators((creators || []) as TrendingCreator[]);
      setTrendingPosts((posts || []) as TrendingPost[]);
    } catch (error) {
      console.error('Error fetching trending data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHashtagPosts = async (tag: string) => {
    setLoading(true);
    const posts = await getPostsByHashtag(tag);
    setHashtagPosts(posts);
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.startsWith('#')) {
      setSearchParams({ tab: 'hashtags', tag: searchQuery.slice(1) });
    } else {
      navigate(`/social?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleHashtagClick = (tag: string) => {
    setSearchParams({ tab: 'hashtags', tag });
  };

  const handlePostClick = (postId: string) => {
    navigate(`/social#post-${postId}`);
  };

  const handleCreatorClick = (creatorId: string) => {
    navigate(`/profile/${creatorId}`);
  };

  const renderPostGrid = (posts: any[]) => (
    <div className="grid grid-cols-3 gap-1 md:gap-2">
      {posts.map((post) => (
        <div
          key={post.id}
          className="aspect-square relative cursor-pointer group overflow-hidden rounded-md"
          onClick={() => handlePostClick(post.id)}
        >
          {post.media_type === 'video' ? (
            <video
              src={post.media_url}
              className="w-full h-full object-cover"
              muted
            />
          ) : (
            <img
              src={post.media_url}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="text-white text-center">
              <p className="font-semibold">❤️ {post.likes_count}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar creadores, #hashtags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>

        <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tendencias
            </TabsTrigger>
            <TabsTrigger value="hashtags" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Hashtags
            </TabsTrigger>
            <TabsTrigger value="creators" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Creadores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="space-y-6">
            {/* Trending Hashtags Row */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Hashtags populares
              </h3>
              <div className="flex flex-wrap gap-2">
                {trendingHashtags.slice(0, 10).map((hashtag) => (
                  <Badge
                    key={hashtag.id}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => handleHashtagClick(hashtag.tag)}
                  >
                    #{hashtag.tag}
                    <span className="ml-1 text-xs opacity-70">{hashtag.use_count}</span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Trending Posts Grid */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Grid3X3 className="h-4 w-4" />
                Posts populares
              </h3>
              {loading ? (
                <div className="grid grid-cols-3 gap-1 md:gap-2">
                  {[...Array(9)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-md" />
                  ))}
                </div>
              ) : (
                renderPostGrid(trendingPosts)
              )}
            </div>
          </TabsContent>

          <TabsContent value="hashtags" className="space-y-6">
            {hashtagFilter ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className="text-lg py-1 px-3">
                    #{hashtagFilter}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchParams({ tab: 'hashtags' })}
                  >
                    ✕ Limpiar
                  </Button>
                </div>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : hashtagPosts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay posts con este hashtag
                  </p>
                ) : (
                  renderPostGrid(hashtagPosts)
                )}
              </div>
            ) : (
              <div>
                <h3 className="font-semibold mb-4">Todos los hashtags</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {trendingHashtags.map((hashtag) => (
                    <div
                      key={hashtag.id}
                      className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleHashtagClick(hashtag.tag)}
                    >
                      <p className="font-medium">#{hashtag.tag}</p>
                      <p className="text-sm text-muted-foreground">
                        {hashtag.use_count} publicaciones
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="creators" className="space-y-4">
            <h3 className="font-semibold mb-4">Creadores destacados</h3>
            {loading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {trendingCreators.map((creator) => (
                  <div
                    key={creator.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleCreatorClick(creator.id)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={creator.avatar_url || undefined} />
                      <AvatarFallback>
                        {creator.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{creator.full_name}</p>
                      {creator.username && (
                        <p className="text-sm text-muted-foreground">@{creator.username}</p>
                      )}
                      {creator.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{creator.bio}</p>
                      )}
                    </div>
                    <Button variant="outline" size="sm">
                      Ver perfil
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PortfolioShell>
  );
}
