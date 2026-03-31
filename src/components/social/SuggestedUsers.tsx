import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserProfileCard, UserProfileCardData } from './UserProfileCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestedUsersProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  variant?: 'grid' | 'carousel' | 'list';
  cardVariant?: 'default' | 'compact' | 'horizontal';
  showRefresh?: boolean;
  className?: string;
  excludeIds?: string[];
}

export function SuggestedUsers({
  title = "Sugeridos para ti",
  subtitle,
  limit = 6,
  variant = 'grid',
  cardVariant = 'default',
  showRefresh = true,
  className,
  excludeIds = [],
}: SuggestedUsersProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfileCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const fetchSuggestedUsers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get users the current user is already following
      const { data: following } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = following?.map(f => f.following_id) || [];
      const idsToExclude = [...followingIds, user.id, ...excludeIds];

      // Fetch suggested users with stats
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          username,
          avatar_url,
          bio,
          tagline,
          city,
          country,
          is_platform_founder,
          founder_badge_type
        `)
        .eq('is_public', true)
        .not('id', 'in', `(${idsToExclude.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Fetch more to have variety

      if (error) throw error;

      // Get follower counts for these users
      const userIds = profiles?.map(p => p.id) || [];
      
      const { data: followerCounts } = await supabase
        .from('followers')
        .select('following_id')
        .in('following_id', userIds);

      // Get content counts
      const { data: contentCounts } = await supabase
        .from('content')
        .select('creator_id')
        .in('creator_id', userIds)
        .eq('is_portfolio_public', true);

      // Build user data with counts
      const usersWithStats: UserProfileCardData[] = (profiles || []).map(profile => {
        const followersCount = followerCounts?.filter(f => f.following_id === profile.id).length || 0;
        const contentCount = contentCounts?.filter(c => c.creator_id === profile.id).length || 0;

        return {
          ...profile,
          followers_count: followersCount,
          content_count: contentCount,
          is_verified: followersCount > 10 || contentCount > 5, // Simple verification logic
        };
      });

      // Sort by engagement (followers + content) and take limit
      const sorted = usersWithStats
        .sort((a, b) => {
          const scoreA = (a.followers_count || 0) + (a.content_count || 0);
          const scoreB = (b.followers_count || 0) + (b.content_count || 0);
          return scoreB - scoreA;
        })
        .slice(0, limit);

      setUsers(sorted);
    } catch (error) {
      console.error('Error fetching suggested users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestedUsers();
  }, [user?.id, excludeIds.join(',')]);

  const handleRefresh = () => {
    fetchSuggestedUsers();
  };

  const handlePrevCarousel = () => {
    setCarouselIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextCarousel = () => {
    const maxIndex = Math.max(0, users.length - 3);
    setCarouselIndex(prev => Math.min(maxIndex, prev + 1));
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40 bg-background" />
          {showRefresh && <Skeleton className="h-8 w-8 rounded-full bg-background" />}
        </div>
        <div className={cn(
          variant === 'grid' && "grid grid-cols-2 md:grid-cols-3 gap-4",
          variant === 'list' && "space-y-3",
          variant === 'carousel' && "flex gap-4 overflow-hidden"
        )}>
          {[...Array(variant === 'list' ? 3 : 6)].map((_, i) => (
            <Skeleton 
              key={i} 
              className={cn(
                "bg-background",
                variant === 'list' ? "h-20 rounded-sm" : "h-64 rounded-sm"
              )} 
            />
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {variant === 'carousel' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handlePrevCarousel}
                disabled={carouselIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleNextCarousel}
                disabled={carouselIndex >= users.length - 3}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          {showRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {variant === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {users.map((user, index) => (
            <div 
              key={user.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <UserProfileCard 
                user={user} 
                variant={cardVariant}
                onFollow={fetchSuggestedUsers}
              />
            </div>
          ))}
        </div>
      )}

      {variant === 'list' && (
        <div className="space-y-3">
          {users.map((user, index) => (
            <div 
              key={user.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <UserProfileCard 
                user={user} 
                variant="horizontal"
                onFollow={fetchSuggestedUsers}
              />
            </div>
          ))}
        </div>
      )}

      {variant === 'carousel' && (
        <div className="relative overflow-hidden">
          <div 
            className="flex gap-4 transition-transform duration-300"
            style={{ transform: `translateX(-${carouselIndex * (100 / 3)}%)` }}
          >
            {users.map((user, index) => (
              <div 
                key={user.id}
                className="flex-shrink-0 w-[calc(33.333%-1rem)] animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <UserProfileCard 
                  user={user} 
                  variant={cardVariant}
                  onFollow={fetchSuggestedUsers}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
