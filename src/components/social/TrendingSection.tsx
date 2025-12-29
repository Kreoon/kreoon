import { useState, useEffect } from 'react';
import { TrendingUp, Hash, Users, Flame, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface TrendingHashtag {
  tag: string;
  count: number;
  change: number; // percentage change
}

interface TrendingCreator {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  followers_count: number;
  is_verified: boolean;
}

interface TrendingSectionProps {
  className?: string;
  variant?: 'sidebar' | 'inline' | 'card';
}

export function TrendingSection({ className, variant = 'sidebar' }: TrendingSectionProps) {
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [creators, setCreators] = useState<TrendingCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hashtags' | 'creators'>('hashtags');

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    try {
      // Fetch trending hashtags (mock data - would need a hashtags table)
      const mockHashtags: TrendingHashtag[] = [
        { tag: 'UGC', count: 1234, change: 25 },
        { tag: 'CreadorContenido', count: 892, change: 15 },
        { tag: 'VideoMarketing', count: 756, change: 42 },
        { tag: 'Creatividad', count: 623, change: 8 },
        { tag: 'Colaboración', count: 512, change: -5 },
      ];
      setHashtags(mockHashtags);

      // Fetch top creators by followers
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .not('username', 'is', null)
        .limit(5);

      if (creatorsData) {
        // Get follower counts
        const creatorsWithFollowers = await Promise.all(
          creatorsData.map(async (creator) => {
            const { count } = await supabase
              .from('followers')
              .select('id', { count: 'exact', head: true })
              .eq('following_id', creator.id);

            return {
              id: creator.id,
              name: creator.full_name || '',
              username: creator.username || '',
              avatar_url: creator.avatar_url,
              is_verified: false,
              followers_count: count || 0,
            };
          })
        );

        setCreators(
          creatorsWithFollowers
            .sort((a, b) => b.followers_count - a.followers_count)
            .slice(0, 5)
        );
      }
    } catch (error) {
      console.error('Error fetching trending:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (variant === 'card') {
    return (
      <div className={cn("glass-card p-4", className)}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-full bg-gradient-to-r from-social-accent to-pink-500">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-semibold text-social-foreground">Tendencias</h3>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 bg-social-muted" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {hashtags.slice(0, 3).map((hashtag, index) => (
              <motion.div
                key={hashtag.tag}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={`/social/explore?tag=${hashtag.tag}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-social-accent" />
                    <span className="font-medium text-social-foreground group-hover:text-social-accent transition-colors">
                      {hashtag.tag}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-social-muted-foreground">
                    <span>{formatCount(hashtag.count)}</span>
                    {hashtag.change > 0 && (
                      <span className="text-green-500 text-xs">+{hashtag.change}%</span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        <Link
          to="/social/explore"
          className="flex items-center justify-center gap-1 mt-4 text-sm text-social-accent hover:underline"
        >
          Ver más <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Tabs */}
      <div className="flex gap-1 p-1 glass-social rounded-lg">
        <button
          onClick={() => setActiveTab('hashtags')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
            activeTab === 'hashtags'
              ? "bg-social-accent text-white"
              : "text-social-muted-foreground hover:text-social-foreground hover:bg-white/5"
          )}
        >
          <Hash className="h-4 w-4" />
          Hashtags
        </button>
        <button
          onClick={() => setActiveTab('creators')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
            activeTab === 'creators'
              ? "bg-social-accent text-white"
              : "text-social-muted-foreground hover:text-social-foreground hover:bg-white/5"
          )}
        >
          <Users className="h-4 w-4" />
          Creadores
        </button>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 bg-social-muted rounded-lg" />
          ))
        ) : activeTab === 'hashtags' ? (
          hashtags.map((hashtag, index) => (
            <motion.div
              key={hashtag.tag}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/social/explore?tag=${hashtag.tag}`}
                className="flex items-center gap-3 p-3 rounded-xl glass-card-hover group"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-social-accent/20 to-pink-500/20 group-hover:from-social-accent/30 group-hover:to-pink-500/30 transition-colors">
                  <Hash className="h-5 w-5 text-social-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-social-foreground group-hover:text-social-accent transition-colors">
                    #{hashtag.tag}
                  </p>
                  <p className="text-sm text-social-muted-foreground">
                    {formatCount(hashtag.count)} publicaciones
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {hashtag.change > 0 ? (
                    <div className="flex items-center gap-1 text-green-500">
                      <Flame className="h-3 w-3" />
                      <span className="text-xs font-medium">+{hashtag.change}%</span>
                    </div>
                  ) : (
                    <span className="text-xs text-social-muted-foreground">{hashtag.change}%</span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))
        ) : (
          creators.map((creator, index) => (
            <motion.div
              key={creator.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/social/u/${creator.id}`}
                className="flex items-center gap-3 p-3 rounded-xl glass-card-hover group"
              >
                <div className="relative">
                  <Avatar className="h-10 w-10 ring-2 ring-social-border group-hover:ring-social-accent/50 transition-all">
                    <AvatarImage src={creator.avatar_url || undefined} />
                    <AvatarFallback className="bg-social-muted text-social-foreground">
                      {creator.name?.[0] || creator.username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {creator.is_verified && (
                    <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-social-background">
                      <Sparkles className="h-3 w-3 text-social-accent" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-social-foreground truncate group-hover:text-social-accent transition-colors">
                    {creator.name || creator.username}
                  </p>
                  <p className="text-sm text-social-muted-foreground">
                    @{creator.username}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-social-foreground">
                    {formatCount(creator.followers_count)}
                  </p>
                  <p className="text-xs text-social-muted-foreground">seguidores</p>
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
