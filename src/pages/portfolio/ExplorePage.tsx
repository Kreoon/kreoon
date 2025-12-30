import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Hash, TrendingUp, Users, Grid3X3, Loader2, Sparkles, Play } from 'lucide-react';
import { useHashtags } from '@/hooks/useHashtags';
import { cn } from '@/lib/utils';

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
  const [searchFocused, setSearchFocused] = useState(false);

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
      const { data: creators } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, avatar_url, username, bio')
        .eq('is_public', true)
        .limit(12);

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
    <div className="grid grid-cols-3 gap-1.5 md:gap-3">
      {posts.map((post, index) => (
        <div
          key={post.id}
          className={cn(
            "aspect-square relative cursor-pointer group overflow-hidden rounded-xl",
            "glass-card border border-white/10",
            "transform transition-all duration-300 hover:scale-[1.02] hover:z-10",
            "animate-fade-in"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={() => handlePostClick(post.id)}
        >
          {post.media_type === 'video' ? (
            <>
              <video
                src={post.media_url}
                className="w-full h-full object-cover"
                muted
              />
              <div className="absolute top-2 right-2 glass-card p-1.5 rounded-full">
                <Play className="h-3 w-3 text-white fill-white" />
              </div>
            </>
          ) : (
            <img
              src={post.media_url}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
          
          {/* Stats on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="glass-card px-4 py-2 rounded-full flex items-center gap-3">
              <span className="text-white text-sm font-medium flex items-center gap-1">
                ❤️ {post.likes_count}
              </span>
              {post.views_count > 0 && (
                <span className="text-white/80 text-sm flex items-center gap-1">
                  👁️ {post.views_count}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:ml-20 lg:ml-64">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Explorar
          </h1>
          <p className="text-muted-foreground text-sm">Descubre tendencias, hashtags y creadores</p>
        </div>

        {/* Search Bar with glassmorphism */}
        <form onSubmit={handleSearch} className="mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className={cn(
            "relative transition-all duration-300",
            searchFocused && "scale-[1.02]"
          )}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar perfiles, #hashtags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className={cn(
                "pl-12 h-12 rounded-xl text-base",
                "glass-card border-white/20",
                "focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
                "transition-all duration-300"
              )}
            />
          </div>
        </form>

        <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
          <TabsList className="w-full grid grid-cols-3 mb-6 glass-card p-1 h-auto rounded-xl animate-fade-in" style={{ animationDelay: '150ms' }}>
            <TabsTrigger 
              value="trending" 
              className="flex items-center gap-2 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Tendencias</span>
            </TabsTrigger>
            <TabsTrigger 
              value="hashtags" 
              className="flex items-center gap-2 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <Hash className="h-4 w-4" />
              <span className="hidden sm:inline">Hashtags</span>
            </TabsTrigger>
            <TabsTrigger 
              value="creators" 
              className="flex items-center gap-2 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Creadores</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="space-y-6">
            {/* Trending Hashtags Row */}
            <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                Hashtags populares
              </h3>
              <div className="flex flex-wrap gap-2">
                {trendingHashtags.slice(0, 10).map((hashtag, index) => (
                  <Badge
                    key={hashtag.id}
                    variant="secondary"
                    className={cn(
                      "cursor-pointer glass-card border border-white/10 px-3 py-1.5",
                      "hover:bg-primary hover:text-primary-foreground hover:scale-105",
                      "transition-all duration-200 animate-fade-in"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => handleHashtagClick(hashtag.tag)}
                  >
                    #{hashtag.tag}
                    <span className="ml-1.5 text-xs opacity-70 bg-white/10 px-1.5 rounded-full">
                      {hashtag.use_count}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Trending Posts Grid */}
            <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-primary" />
                Posts populares
              </h3>
              {loading ? (
                <div className="grid grid-cols-3 gap-1.5 md:gap-3">
                  {[...Array(9)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-xl" />
                  ))}
                </div>
              ) : (
                renderPostGrid(trendingPosts)
              )}
            </div>
          </TabsContent>

          <TabsContent value="hashtags" className="space-y-6">
            {hashtagFilter ? (
              <div className="animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  <Badge 
                    variant="outline" 
                    className="text-lg py-2 px-4 glass-card border-primary/30 bg-primary/10"
                  >
                    #{hashtagFilter}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchParams({ tab: 'hashtags' })}
                    className="glass-card"
                  >
                    ✕ Limpiar
                  </Button>
                </div>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : hashtagPosts.length === 0 ? (
                  <div className="text-center py-12 glass-card rounded-2xl">
                    <Hash className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No hay posts con este hashtag</p>
                  </div>
                ) : (
                  renderPostGrid(hashtagPosts)
                )}
              </div>
            ) : (
              <div className="animate-fade-in">
                <h3 className="font-semibold mb-4">Todos los hashtags</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {trendingHashtags.map((hashtag, index) => (
                    <div
                      key={hashtag.id}
                      className={cn(
                        "p-4 rounded-xl glass-card border border-white/10 cursor-pointer",
                        "hover:border-primary/30 hover:bg-primary/5 hover:scale-[1.02]",
                        "transition-all duration-200 animate-fade-in"
                      )}
                      style={{ animationDelay: `${index * 30}ms` }}
                      onClick={() => handleHashtagClick(hashtag.tag)}
                    >
                      <p className="font-medium text-primary">#{hashtag.tag}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {hashtag.use_count} publicaciones
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="creators" className="space-y-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2 animate-fade-in">
              <Sparkles className="h-4 w-4 text-primary" />
              Creadores destacados
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {trendingCreators.map((creator, index) => (
                  <div
                    key={creator.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl glass-card border border-white/10 cursor-pointer",
                      "hover:border-primary/30 hover:bg-primary/5 hover:scale-[1.01]",
                      "transition-all duration-200 animate-fade-in"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => handleCreatorClick(creator.id)}
                  >
                    <Avatar className="h-14 w-14 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                      <AvatarImage src={creator.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {creator.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{creator.full_name}</p>
                      {creator.username && (
                        <p className="text-sm text-primary/80">@{creator.username}</p>
                      )}
                      {creator.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{creator.bio}</p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="glass-card border-primary/30 hover:bg-primary hover:text-primary-foreground shrink-0"
                    >
                      Ver perfil
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
