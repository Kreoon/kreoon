import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, Star, Trophy, Crown, Award, Medal, Gem, 
  Zap, Flame, Target, CheckCircle2, Users, TrendingUp,
  Sword, Castle, Send, Clock, Coins, ChevronUp, Swords
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { UnifiedBadgesShowcase } from '@/components/points/UnifiedBadgesShowcase';

interface ProfileTrustBadgesProps {
  userId: string;
  compact?: boolean;
}

interface UserPoints {
  total_points: number;
  current_level: string;
  total_completions: number;
  total_on_time: number;
  consecutive_on_time: number;
}

interface UserRatings {
  avg_creator_rating: number | null;
  avg_editor_rating: number | null;
  avg_strategy_rating: number | null;
  total_rated: number;
}

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

interface UserAchievement {
  id: string;
  unlocked_at: string;
  achievement: Achievement;
}

interface OrgBadge {
  id: string;
  badge: string;
  level: string;
  is_active: boolean;
  granted_at: string;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  sword: Sword,
  shield: Shield,
  castle: Castle,
  crown: Crown,
  zap: Zap,
  send: Send,
  clock: Clock,
  flame: Flame,
  coins: Coins,
  gem: Gem,
  trophy: Trophy,
  medal: Medal,
  star: Star,
  'chevron-up': ChevronUp,
  swords: Swords,
  target: Target,
  award: Award,
};

const LEVEL_CONFIG = {
  bronze: {
    label: 'Bronce',
    color: 'from-amber-600 to-amber-800',
    border: 'border-amber-600',
    textColor: 'text-amber-500',
    icon: Shield,
  },
  silver: {
    label: 'Plata',
    color: 'from-slate-300 to-slate-500',
    border: 'border-slate-400',
    textColor: 'text-slate-400',
    icon: Medal,
  },
  gold: {
    label: 'Oro',
    color: 'from-yellow-400 to-amber-500',
    border: 'border-yellow-500',
    textColor: 'text-yellow-500',
    icon: Trophy,
  },
  diamond: {
    label: 'Diamante',
    color: 'from-cyan-300 to-blue-500',
    border: 'border-cyan-400',
    textColor: 'text-cyan-400',
    icon: Gem,
  },
};

const RARITY_STYLES = {
  common: 'from-stone-400 to-stone-600 border-stone-500/50',
  uncommon: 'from-emerald-400 to-emerald-600 border-emerald-500/50',
  rare: 'from-blue-400 to-blue-600 border-blue-500/50',
  legendary: 'from-amber-400 via-yellow-500 to-orange-500 border-amber-500/50',
};

export function ProfileTrustBadges({ userId, compact = false }: ProfileTrustBadgesProps) {
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [orgBadges, setOrgBadges] = useState<OrgBadge[]>([]);
  const [userRatings, setUserRatings] = useState<UserRatings | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch from V2 tables and user_achievements
        const [creatorTotalsRes, achievementsRes, badgesRes] = await Promise.all([
          supabase
            .from('up_creadores_totals')
            .select('total_points, current_level, total_deliveries, on_time_deliveries')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('user_achievements')
            .select('id, unlocked_at, achievement_id')
            .eq('user_id', userId)
            .order('unlocked_at', { ascending: false })
            .limit(10),
          supabase
            .from('organization_member_badges')
            .select('id, badge, level, is_active, granted_at')
            .eq('user_id', userId)
            .eq('is_active', true),
        ]);

        if (creatorTotalsRes.data) {
          // Map V2 data to the UserPoints interface
          setUserPoints({
            total_points: creatorTotalsRes.data.total_points || 0,
            current_level: creatorTotalsRes.data.current_level || 'bronze',
            total_completions: creatorTotalsRes.data.total_deliveries || 0,
            total_on_time: creatorTotalsRes.data.on_time_deliveries || 0,
            consecutive_on_time: 0 // Not tracked in V2 totals
          });
        }
        if (achievementsRes.data && achievementsRes.data.length > 0) {
          const uaList = achievementsRes.data as { id: string; unlocked_at: string; achievement_id: string }[];
          const achIds = [...new Set(uaList.map((u) => u.achievement_id).filter(Boolean))];
          const { data: achData } = achIds.length > 0
            ? await supabase.from('achievements').select('*').in('id', achIds)
            : { data: [] };
          const achMap = new Map((achData ?? []).map((a) => [a.id, a]));
          const mapped: UserAchievement[] = uaList
            .filter((u) => achMap.has(u.achievement_id))
            .map((u) => ({ id: u.id, unlocked_at: u.unlocked_at, achievement: achMap.get(u.achievement_id)! }));
          setAchievements(mapped);
        }
        if (badgesRes.data) setOrgBadges(badgesRes.data);

        // Fetch star ratings from content
        const [creatorRatingsRes, editorRatingsRes, strategyRatingsRes] = await Promise.all([
          supabase
            .from('content')
            .select('creator_rating')
            .eq('creator_id', userId)
            .not('creator_rating', 'is', null),
          supabase
            .from('content')
            .select('editor_rating')
            .eq('editor_id', userId)
            .not('editor_rating', 'is', null),
          supabase
            .from('content')
            .select('strategy_rating')
            .eq('strategist_id', userId)
            .not('strategy_rating', 'is', null),
        ]);

        // Calculate averages
        const creatorRatings = creatorRatingsRes.data || [];
        const editorRatings = editorRatingsRes.data || [];
        const strategyRatings = strategyRatingsRes.data || [];

        const avgCreator = creatorRatings.length > 0 
          ? creatorRatings.reduce((sum, r) => sum + (r.creator_rating || 0), 0) / creatorRatings.length 
          : null;
        const avgEditor = editorRatings.length > 0 
          ? editorRatings.reduce((sum, r) => sum + (r.editor_rating || 0), 0) / editorRatings.length 
          : null;
        const avgStrategy = strategyRatings.length > 0 
          ? strategyRatings.reduce((sum, r) => sum + (r.strategy_rating || 0), 0) / strategyRatings.length 
          : null;

        const totalRated = creatorRatings.length + editorRatings.length + strategyRatings.length;

        if (totalRated > 0) {
          setUserRatings({
            avg_creator_rating: avgCreator,
            avg_editor_rating: avgEditor,
            avg_strategy_rating: avgStrategy,
            total_rated: totalRated,
          });
        }
      } catch (error) {
        console.error('Error fetching trust badges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-full bg-social-muted" />
        <Skeleton className="h-8 w-8 rounded-full bg-social-muted" />
        <Skeleton className="h-8 w-8 rounded-full bg-social-muted" />
      </div>
    );
  }

  const hasContent = userPoints || achievements.length > 0 || orgBadges.length > 0 || userRatings;
  if (!hasContent) return null;

  // Calculate overall star rating (highest average across roles)
  const overallStarRating = userRatings ? Math.max(
    userRatings.avg_creator_rating || 0,
    userRatings.avg_editor_rating || 0,
    userRatings.avg_strategy_rating || 0
  ) : 0;

  const levelConfig = userPoints?.current_level 
    ? LEVEL_CONFIG[userPoints.current_level as keyof typeof LEVEL_CONFIG] 
    : LEVEL_CONFIG.bronze;
  const LevelIcon = levelConfig?.icon || Shield;

  // Calculate trust score
  const trustScore = calculateTrustScore(userPoints, achievements.length, orgBadges.length);

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Star Rating Badge */}
          {overallStarRating > 0 && (
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  variant="outline" 
                  className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-0 gap-1"
                >
                  <Star className="h-3 w-3 fill-current" />
                  {overallStarRating.toFixed(1)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="bg-social-card border-social-border">
                <div className="space-y-1 text-social-foreground">
                  {userRatings?.avg_creator_rating && (
                    <p className="text-xs">Creación: {userRatings.avg_creator_rating.toFixed(1)} ⭐</p>
                  )}
                  {userRatings?.avg_editor_rating && (
                    <p className="text-xs">Edición: {userRatings.avg_editor_rating.toFixed(1)} ⭐</p>
                  )}
                  {userRatings?.avg_strategy_rating && (
                    <p className="text-xs">Estrategia: {userRatings.avg_strategy_rating.toFixed(1)} ⭐</p>
                  )}
                  <p className="text-xs text-social-muted-foreground">{userRatings?.total_rated} proyectos calificados</p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Level Badge */}
          {userPoints && (
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "bg-gradient-to-r text-white border-0 gap-1",
                    levelConfig.color
                  )}
                >
                  <LevelIcon className="h-3 w-3" />
                  {levelConfig.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="bg-social-card border-social-border">
                <p className="text-social-foreground">{userPoints.total_points} UP • Nivel {levelConfig.label}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Organization Badges */}
          {orgBadges.map((badge) => (
            <Tooltip key={badge.id}>
              <TooltipTrigger>
                <Badge 
                  variant="outline"
                  className={cn(
                    "bg-gradient-to-r text-white border-0 gap-1",
                    badge.level === 'gold' ? 'from-yellow-500 to-amber-600' :
                    badge.level === 'silver' ? 'from-slate-400 to-slate-500' :
                    'from-amber-600 to-amber-700'
                  )}
                >
                  <Crown className="h-3 w-3" />
                  {badge.badge === 'ambassador' ? 'Embajador' : badge.badge}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="bg-social-card border-social-border">
                <p className="text-social-foreground">
                  Embajador {badge.level?.charAt(0).toUpperCase()}{badge.level?.slice(1)}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Top achievements - show first 3 */}
          {achievements.slice(0, 3).map((ua) => {
            const IconComponent = ICON_MAP[ua.achievement.icon] || Shield;
            return (
              <Tooltip key={ua.id}>
                <TooltipTrigger>
                  <div className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center bg-gradient-to-br border",
                    RARITY_STYLES[ua.achievement.rarity]
                  )}>
                    <IconComponent className="h-3.5 w-3.5 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-social-card border-social-border">
                  <p className="font-medium text-social-foreground">{ua.achievement.name}</p>
                  <p className="text-xs text-social-muted-foreground">{ua.achievement.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {achievements.length > 3 && (
            <Badge variant="outline" className="bg-social-muted text-social-muted-foreground border-social-border text-xs">
              +{achievements.length - 3}
            </Badge>
          )}
        </div>
      </TooltipProvider>
    );
  }

  // Full view - Use unified component
  return (
    <UnifiedBadgesShowcase 
      userId={userId} 
      variant="full"
      showOrgBadges={true}
      showLevelProgress={true}
    />
  );
}

function StatBlock({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-social-muted-foreground mb-1">
        {icon}
      </div>
      <p className="text-lg font-bold text-social-foreground">{value}</p>
      <p className="text-xs text-social-muted-foreground">{label}</p>
    </div>
  );
}

function calculateTrustScore(
  points: UserPoints | null, 
  achievementsCount: number, 
  badgesCount: number
): number {
  let score = 50; // Base score
  
  if (points) {
    // Level bonus
    if (points.current_level === 'diamond') score += 20;
    else if (points.current_level === 'gold') score += 15;
    else if (points.current_level === 'silver') score += 10;
    else score += 5;

    // On-time delivery rate
    const total = points.total_on_time + points.total_completions;
    if (total > 0) {
      const onTimeRate = points.total_on_time / total;
      score += Math.round(onTimeRate * 15);
    }
  }

  // Achievements bonus (max 10)
  score += Math.min(achievementsCount * 2, 10);

  // Organization badges bonus
  score += badgesCount * 5;

  return Math.min(score, 100);
}

export default ProfileTrustBadges;
