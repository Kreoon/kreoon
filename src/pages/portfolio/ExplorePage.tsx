import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, Hash, TrendingUp, Users, Grid3X3, Loader2, Sparkles, Play, 
  ArrowLeft, MapPin, RefreshCw 
} from 'lucide-react';
import { useHashtags } from '@/hooks/useHashtags';
import { cn } from '@/lib/utils';
import { UserProfileCard, UserProfileCardData } from '@/components/social/UserProfileCard';
import { SuggestedUsers } from '@/components/social/SuggestedUsers';
import { UserSearchFilters, SearchFilters } from '@/components/social/UserSearchFilters';
import { KreoonSocialLogo } from '@/components/social/KreoonSocialBrand';
import { useAuth } from '@/hooks/useAuth';

interface TrendingPost {
  id: string;
  media_url: string;
  media_type: string;
  likes_count: number;
  views_count: number;
  user_id: string;
}

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  category: '',
  city: '',
  country: '',
  hasContent: false,
  isVerified: false,
  sortBy: 'followers',
};

export default function ExplorePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'discover';
  const hashtagFilter = searchParams.get('tag');

  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [searchResults, setSearchResults] = useState<UserProfileCardData[]>([]);
  const [trendingCreators, setTrendingCreators] = useState<UserProfileCardData[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [hashtagPosts, setHashtagPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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
      // Fetch trending creators with stats
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username, bio, tagline, city, country, is_platform_founder, founder_badge_type')
        .eq('is_public', true)
        .limit(12);

      // Get follower counts
      const profileIds = profiles?.map(p => p.id) || [];
      const { data: followerCounts } = await supabase
        .from('followers')
        .select('following_id')
        .in('following_id', profileIds);

      // Get content counts
      const { data: contentCounts } = await supabase
        .from('content')
        .select('creator_id')
        .in('creator_id', profileIds)
        .eq('is_portfolio_public', true);

      const creatorsWithStats: UserProfileCardData[] = (profiles || []).map(profile => {
        const followersCount = followerCounts?.filter(f => f.following_id === profile.id).length || 0;
        const contentCount = contentCounts?.filter(c => c.creator_id === profile.id).length || 0;

        return {
          ...profile,
          followers_count: followersCount,
          content_count: contentCount,
          is_verified: followersCount > 10 || contentCount > 5,
        };
      });

      // Sort by engagement
      const sortedCreators = creatorsWithStats.sort((a, b) => {
        const scoreA = (a.followers_count || 0) + (a.content_count || 0);
        const scoreB = (b.followers_count || 0) + (b.content_count || 0);
        return scoreB - scoreA;
      });

      setTrendingCreators(sortedCreators);

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

      setTrendingPosts((posts || []) as TrendingPost[]);
    } catch (error) {
      console.error('Error fetching trending data:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = useCallback(async () => {
    setSearchLoading(true);
    setHasSearched(true);
    try {
      // Build query with type assertion to avoid deep instantiation
      const baseQuery = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username, bio, tagline, city, country, is_platform_founder, founder_badge_type')
        .eq('is_public', true);

      let query = baseQuery;

      // Apply filters
      if (filters.query) {
        query = query.or(`full_name.ilike.%${filters.query}%,username.ilike.%${filters.query}%`);
      }
      if (filters.country) {
        query = query.eq('country', filters.country);
      }
      if (filters.city) {
        query = query.eq('city', filters.city);
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'recent':
          query = query.order('created_at', { ascending: false });
          break;
        case 'name':
          query = query.order('full_name', { ascending: true });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data: profiles, error } = await query.limit(50);
      if (error) throw error;

      // Get stats for filtered users
      const profileIds = profiles?.map(p => p.id) || [];
      
      const { data: followerCounts } = await supabase
        .from('followers')
        .select('following_id')
        .in('following_id', profileIds);

      const { data: contentCounts } = await supabase
        .from('content')
        .select('creator_id')
        .in('creator_id', profileIds)
        .eq('is_portfolio_public', true);

      let results: UserProfileCardData[] = (profiles || []).map(profile => {
        const followersCount = followerCounts?.filter(f => f.following_id === profile.id).length || 0;
        const contentCount = contentCounts?.filter(c => c.creator_id === profile.id).length || 0;

        return {
          ...profile,
          followers_count: followersCount,
          content_count: contentCount,
          is_verified: followersCount > 10 || contentCount > 5,
        };
      });

      // Apply additional filters
      if (filters.hasContent) {
        results = results.filter(r => (r.content_count || 0) > 0);
      }
      if (filters.isVerified) {
        results = results.filter(r => r.is_verified);
      }

      // Sort by followers or content if selected
      if (filters.sortBy === 'followers') {
        results.sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0));
      } else if (filters.sortBy === 'content') {
        results.sort((a, b) => (b.content_count || 0) - (a.content_count || 0));
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  }, [filters]);

  const loadHashtagPosts = async (tag: string) => {
    setLoading(true);
    const posts = await getPostsByHashtag(tag);
    setHashtagPosts(posts);
    setLoading(false);
  };

  const handleHashtagClick = (tag: string) => {
    setSearchParams({ tab: 'hashtags', tag });
  };

  const handlePostClick = (postId: string) => {
    navigate(`/social#post-${postId}`);
  };

  const renderPostGrid = (posts: any[]) => (
    <div className="grid grid-cols-3 gap-1.5 md:gap-3">
      {posts.map((post, index) => (
        <div
          key={post.id}
          className={cn(
            "aspect-[4/5] relative cursor-pointer group overflow-hidden rounded-xl",
            "bg-social-card border border-social-border/50",
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
              <div className="absolute top-2 right-2 bg-social-card/80 backdrop-blur-sm p-1.5 rounded-full">
                <Play className="h-3 w-3 text-social-foreground fill-current" />
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
            <div className="bg-social-card/80 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-3">
              <span className="text-social-foreground text-sm font-medium flex items-center gap-1">
                ❤️ {post.likes_count}
              </span>
              {post.views_count > 0 && (
                <span className="text-social-muted-foreground text-sm flex items-center gap-1">
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
    <div className="min-h-screen bg-social-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-social-background/95 backdrop-blur-lg border-b border-social-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3 md:ml-20 lg:ml-64">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/social')}
            className="text-social-foreground hover:bg-social-muted md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <KreoonSocialLogo className="md:hidden" />
          <h1 className="hidden md:flex items-center gap-2 text-xl font-semibold text-social-foreground">
            <Sparkles className="h-5 w-5 text-social-accent" />
            Explorar
          </h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:ml-20 lg:ml-64">
        <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
          <TabsList className="w-full grid grid-cols-4 mb-6 bg-social-card p-1 h-auto rounded-xl border border-social-border/50">
            <TabsTrigger 
              value="discover" 
              className="flex items-center gap-2 py-3 rounded-lg data-[state=active]:bg-social-accent data-[state=active]:text-social-accent-foreground transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Descubrir</span>
            </TabsTrigger>
            <TabsTrigger 
              value="search" 
              className="flex items-center gap-2 py-3 rounded-lg data-[state=active]:bg-social-accent data-[state=active]:text-social-accent-foreground transition-all"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Buscar</span>
            </TabsTrigger>
            <TabsTrigger 
              value="hashtags" 
              className="flex items-center gap-2 py-3 rounded-lg data-[state=active]:bg-social-accent data-[state=active]:text-social-accent-foreground transition-all"
            >
              <Hash className="h-4 w-4" />
              <span className="hidden sm:inline">Hashtags</span>
            </TabsTrigger>
            <TabsTrigger 
              value="trending" 
              className="flex items-center gap-2 py-3 rounded-lg data-[state=active]:bg-social-accent data-[state=active]:text-social-accent-foreground transition-all"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Tendencias</span>
            </TabsTrigger>
          </TabsList>

          {/* Discover Tab - Main discovery page */}
          <TabsContent value="discover" className="space-y-8">
            {/* Suggested Users Section */}
            <SuggestedUsers 
              title="Sugeridos para ti"
              subtitle="Basado en tus intereses"
              limit={6}
              variant="grid"
              cardVariant="default"
            />

            {/* Top Creators */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-social-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-social-accent" />
                  Creadores destacados
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={fetchTrendingData}
                  className="text-social-muted-foreground hover:text-social-foreground"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-xl bg-social-muted" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {trendingCreators.slice(0, 4).map((creator, index) => (
                    <div 
                      key={creator.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <UserProfileCard 
                        user={creator} 
                        variant="horizontal"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trending Hashtags */}
            <div className="space-y-4">
              <h3 className="font-semibold text-social-foreground flex items-center gap-2">
                <Hash className="h-4 w-4 text-social-accent" />
                Hashtags populares
              </h3>
              <div className="flex flex-wrap gap-2">
                {trendingHashtags.slice(0, 12).map((hashtag, index) => (
                  <Badge
                    key={hashtag.id}
                    variant="secondary"
                    className={cn(
                      "cursor-pointer bg-social-muted/50 border border-social-border/50 px-3 py-1.5",
                      "hover:bg-social-accent hover:text-social-accent-foreground hover:border-social-accent",
                      "transition-all duration-200 animate-fade-in"
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                    onClick={() => handleHashtagClick(hashtag.tag)}
                  >
                    #{hashtag.tag}
                    <span className="ml-1.5 text-xs opacity-70">
                      {hashtag.use_count}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Search Tab - Advanced user search */}
          <TabsContent value="search" className="space-y-6">
            <UserSearchFilters
              filters={filters}
              onFiltersChange={setFilters}
              onSearch={searchUsers}
            />

            {searchLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-social-accent" />
              </div>
            ) : hasSearched ? (
              searchResults.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-social-muted-foreground">
                    {searchResults.length} creadores encontrados
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {searchResults.map((user, index) => (
                      <div 
                        key={user.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <UserProfileCard user={user} variant="default" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-social-card/50 rounded-2xl border border-social-border/50">
                  <Users className="h-12 w-12 mx-auto mb-3 text-social-muted-foreground/50" />
                  <p className="text-social-muted-foreground">No se encontraron creadores</p>
                  <p className="text-sm text-social-muted-foreground/70 mt-1">
                    Intenta con otros filtros o términos de búsqueda
                  </p>
                </div>
              )
            ) : (
              <div className="text-center py-12 bg-social-card/50 rounded-2xl border border-social-border/50">
                <Search className="h-12 w-12 mx-auto mb-3 text-social-muted-foreground/50" />
                <p className="text-social-muted-foreground">Busca creadores</p>
                <p className="text-sm text-social-muted-foreground/70 mt-1">
                  Usa los filtros para encontrar el creador perfecto
                </p>
              </div>
            )}
          </TabsContent>

          {/* Hashtags Tab */}
          <TabsContent value="hashtags" className="space-y-6">
            {hashtagFilter ? (
              <div className="animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  <Badge 
                    variant="outline" 
                    className="text-lg py-2 px-4 bg-social-card border-social-accent/30"
                  >
                    #{hashtagFilter}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchParams({ tab: 'hashtags' })}
                    className="bg-social-card"
                  >
                    ✕ Limpiar
                  </Button>
                </div>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-social-accent" />
                  </div>
                ) : hashtagPosts.length === 0 ? (
                  <div className="text-center py-12 bg-social-card/50 rounded-2xl border border-social-border/50">
                    <Hash className="h-12 w-12 mx-auto mb-3 text-social-muted-foreground/50" />
                    <p className="text-social-muted-foreground">No hay posts con este hashtag</p>
                  </div>
                ) : (
                  renderPostGrid(hashtagPosts)
                )}
              </div>
            ) : (
              <div className="animate-fade-in">
                <h3 className="font-semibold mb-4 text-social-foreground">Todos los hashtags</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {trendingHashtags.map((hashtag, index) => (
                    <div
                      key={hashtag.id}
                      className={cn(
                        "p-4 rounded-xl bg-social-card border border-social-border/50 cursor-pointer",
                        "hover:border-social-accent/30 hover:bg-social-accent/5 hover:scale-[1.02]",
                        "transition-all duration-200 animate-fade-in"
                      )}
                      style={{ animationDelay: `${index * 30}ms` }}
                      onClick={() => handleHashtagClick(hashtag.tag)}
                    >
                      <p className="font-medium text-social-accent">#{hashtag.tag}</p>
                      <p className="text-sm text-social-muted-foreground mt-1">
                        {hashtag.use_count} publicaciones
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Trending Tab */}
          <TabsContent value="trending" className="space-y-6">
            {/* Trending Posts Grid */}
            <div className="animate-fade-in">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-social-foreground">
                <Grid3X3 className="h-4 w-4 text-social-accent" />
                Posts populares
              </h3>
              {loading ? (
                <div className="grid grid-cols-3 gap-1.5 md:gap-3">
                  {[...Array(9)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-xl bg-social-muted" />
                  ))}
                </div>
              ) : (
                renderPostGrid(trendingPosts)
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
