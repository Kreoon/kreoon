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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pointsRes, achievementsRes, badgesRes] = await Promise.all([
          supabase
            .from('user_points')
            .select('total_points, current_level, total_completions, total_on_time, consecutive_on_time')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('user_achievements')
            .select('id, unlocked_at, achievement:achievements(*)')
            .eq('user_id', userId)
            .order('unlocked_at', { ascending: false })
            .limit(10),
          supabase
            .from('organization_member_badges')
            .select('id, badge, level, is_active, granted_at')
            .eq('user_id', userId)
            .eq('is_active', true),
        ]);

        if (pointsRes.data) setUserPoints(pointsRes.data);
        if (achievementsRes.data) {
          setAchievements(achievementsRes.data as unknown as UserAchievement[]);
        }
        if (badgesRes.data) setOrgBadges(badgesRes.data);
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

  const hasContent = userPoints || achievements.length > 0 || orgBadges.length > 0;
  if (!hasContent) return null;

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

  // Full view
  return (
    <div className="space-y-4">
      {/* Trust Score Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-social-foreground flex items-center gap-2">
          <Shield className="h-5 w-5 text-social-accent" />
          Insignias de Confianza
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-social-accent/20 text-social-accent">
            <Star className="h-4 w-4 fill-social-accent" />
            <span className="font-bold">{trustScore}%</span>
          </div>
        </div>
      </div>

      {/* Level & Points Section */}
      {userPoints && (
        <div className="p-4 rounded-xl bg-social-card border border-social-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-14 w-14 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
                levelConfig.color
              )}>
                <LevelIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-social-muted-foreground">Nivel actual</p>
                <p className={cn("text-xl font-bold", levelConfig.textColor)}>
                  {levelConfig.label}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-social-foreground">{userPoints.total_points}</p>
              <p className="text-sm text-social-muted-foreground">UP totales</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-social-border">
            <StatBlock 
              icon={<CheckCircle2 className="h-4 w-4" />} 
              value={userPoints.total_completions} 
              label="Completados" 
            />
            <StatBlock 
              icon={<Clock className="h-4 w-4" />} 
              value={userPoints.total_on_time} 
              label="A tiempo" 
            />
            <StatBlock 
              icon={<Flame className="h-4 w-4" />} 
              value={userPoints.consecutive_on_time} 
              label="Racha" 
            />
          </div>
        </div>
      )}

      {/* Organization Badges */}
      {orgBadges.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-social-muted-foreground">Badges de Organización</p>
          <div className="flex flex-wrap gap-2">
            {orgBadges.map((badge) => (
              <TooltipProvider key={badge.id}>
                <Tooltip>
                  <TooltipTrigger>
                    <div className={cn(
                      "px-4 py-2 rounded-xl flex items-center gap-2 bg-gradient-to-r shadow-lg cursor-pointer hover:scale-105 transition-transform",
                      badge.level === 'gold' ? 'from-yellow-500 to-amber-600' :
                      badge.level === 'silver' ? 'from-slate-400 to-slate-500' :
                      'from-amber-600 to-amber-700'
                    )}>
                      <Crown className="h-5 w-5 text-white" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">
                          {badge.badge === 'ambassador' ? 'Embajador' : badge.badge}
                        </p>
                        <p className="text-xs text-white/70">
                          {badge.level?.charAt(0).toUpperCase()}{badge.level?.slice(1)}
                        </p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-social-card border-social-border">
                    <p className="text-social-foreground">
                      Otorgado el {format(new Date(badge.granted_at), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      )}

      {/* Achievements Grid */}
      {achievements.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-social-muted-foreground">Logros Desbloqueados</p>
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {achievements.map((ua) => {
              const IconComponent = ICON_MAP[ua.achievement.icon] || Shield;
              return (
                <TooltipProvider key={ua.id}>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br border-2 cursor-pointer hover:scale-110 transition-transform shadow-lg",
                        RARITY_STYLES[ua.achievement.rarity],
                        ua.achievement.rarity === 'legendary' && 'animate-pulse'
                      )}>
                        <IconComponent className="h-5 w-5 text-white drop-shadow" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-social-card border-social-border max-w-xs">
                      <div className="space-y-1">
                        <p className="font-bold text-social-foreground">{ua.achievement.name}</p>
                        <p className="text-xs text-social-muted-foreground">{ua.achievement.description}</p>
                        <p className="text-xs text-social-accent">
                          {format(new Date(ua.unlocked_at), "d MMM yyyy", { locale: es })}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      )}
    </div>
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
