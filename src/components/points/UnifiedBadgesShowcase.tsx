import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, Star, Trophy, Crown, Award, Medal, Gem, 
  Zap, Flame, Clock, Coins, ChevronUp, Swords,
  Sword, Castle, Send, Target, CheckCircle2,
  Sparkles, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useAchievements, RARITY_LABELS, RARITY_COLORS, RARITY_BORDERS } from '@/hooks/useAchievements';
import type { Achievement } from '@/hooks/useAchievements';

interface UnifiedBadgesShowcaseProps {
  userId: string;
  variant?: 'full' | 'compact' | 'minimal';
  showOrgBadges?: boolean;
  showLevelProgress?: boolean;
}

interface OrgBadge {
  id: string;
  badge: string;
  level: string;
  is_active: boolean;
  granted_at: string;
}

interface UPStats {
  total_points: number;
  current_level: string;
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

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ComponentType<any>; description: string }> = {
  completion: { label: 'Conquistas', icon: Swords, description: 'Por completar contenido' },
  punctuality: { label: 'Velocidad', icon: Flame, description: 'Por entregar a tiempo' },
  streak: { label: 'Rachas', icon: Crown, description: 'Por mantener consistencia' },
  points: { label: 'Tesoros', icon: Star, description: 'Por acumular puntos' },
  special: { label: 'Especiales', icon: Castle, description: 'Logros únicos' },
  level: { label: 'Ascensos', icon: Shield, description: 'Por subir de nivel' },
};

const LEVEL_CONFIG = {
  bronze: {
    label: 'Bronce',
    color: 'from-amber-600 to-amber-800',
    border: 'border-amber-600',
    textColor: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    icon: Shield,
    minPoints: 0,
  },
  silver: {
    label: 'Plata',
    color: 'from-slate-300 to-slate-500',
    border: 'border-slate-400',
    textColor: 'text-slate-400',
    bgColor: 'bg-slate-400/10',
    icon: Medal,
    minPoints: 500,
  },
  gold: {
    label: 'Oro',
    color: 'from-yellow-400 to-amber-500',
    border: 'border-yellow-500',
    textColor: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    icon: Trophy,
    minPoints: 2000,
  },
  diamond: {
    label: 'Diamante',
    color: 'from-cyan-300 to-blue-500',
    border: 'border-cyan-400',
    textColor: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
    icon: Gem,
    minPoints: 5000,
  },
};

const ORG_BADGE_CONFIG: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  ambassador: { label: 'Embajador', icon: Crown, color: 'from-purple-500 to-pink-500' },
  verified: { label: 'Verificado', icon: CheckCircle2, color: 'from-blue-500 to-cyan-500' },
  top_performer: { label: 'Top Performer', icon: TrendingUp, color: 'from-emerald-500 to-green-500' },
};

function mapLevel(newLevel: string): string {
  const MAP: Record<string, string> = {
    Novato: 'bronze', Pro: 'silver', Elite: 'gold', Master: 'diamond', Legend: 'diamond'
  };
  return MAP[newLevel] || 'bronze';
}

export function UnifiedBadgesShowcase({ 
  userId, 
  variant = 'full',
  showOrgBadges = true,
  showLevelProgress = true 
}: UnifiedBadgesShowcaseProps) {
  const [orgBadges, setOrgBadges] = useState<OrgBadge[]>([]);
  const [upStats, setUpStats] = useState<UPStats | null>(null);
  const [loadingExtra, setLoadingExtra] = useState(true);

  const { 
    achievements, 
    loading: loadingAchievements, 
    isUnlocked, 
    getUnlockedDate,
    getAchievementsByCategory, 
    getProgress,
    userAchievements
  } = useAchievements(userId);

  useEffect(() => {
    const fetchExtraData = async () => {
      try {
        // Fetch org badges
        let orgBadgesData: OrgBadge[] = [];
        if (showOrgBadges) {
          const { data } = await supabase
            .from('organization_member_badges')
            .select('id, badge, level, is_active, granted_at')
            .eq('user_id', userId)
            .eq('is_active', true);
          orgBadgesData = data || [];
          setOrgBadges(orgBadgesData);
        }

        // Fetch UP stats from reputation totals table
        const { data: upData } = await supabase
          .from('user_reputation_totals' as any)
          .select('lifetime_points, current_level')
          .eq('user_id', userId)
          .order('lifetime_points', { ascending: false })
          .limit(1)
          .maybeSingle();

        setUpStats({
          total_points: upData?.lifetime_points || 0,
          current_level: mapLevel(upData?.current_level || 'Novato'),
        });
      } catch (error) {
        console.error('Error fetching extra badge data:', error);
      } finally {
        setLoadingExtra(false);
      }
    };

    fetchExtraData();
  }, [userId, showOrgBadges]);

  const loading = loadingAchievements || loadingExtra;

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-card to-card/80">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = getProgress();
  const groupedAchievements = getAchievementsByCategory();
  const levelConfig = upStats?.current_level 
    ? LEVEL_CONFIG[upStats.current_level as keyof typeof LEVEL_CONFIG] 
    : LEVEL_CONFIG.bronze;
  const LevelIcon = levelConfig?.icon || Shield;

  // Calculate next level progress
  const getNextLevelProgress = () => {
    if (!upStats) return { progress: 0, current: 0, next: 500, nextLevel: 'silver' };
    const points = upStats.total_points;
    const levels = ['bronze', 'silver', 'gold', 'diamond'] as const;
    const currentIndex = levels.indexOf(upStats.current_level as any);
    
    if (currentIndex === levels.length - 1) {
      return { progress: 100, current: points, next: points, nextLevel: 'diamond' };
    }
    
    const currentMin = LEVEL_CONFIG[levels[currentIndex]].minPoints;
    const nextMin = LEVEL_CONFIG[levels[currentIndex + 1]].minPoints;
    const progressPercent = ((points - currentMin) / (nextMin - currentMin)) * 100;
    
    return { 
      progress: Math.min(progressPercent, 100), 
      current: points, 
      next: nextMin,
      nextLevel: levels[currentIndex + 1]
    };
  };

  const nextLevelInfo = getNextLevelProgress();

  if (variant === 'minimal') {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Level Badge */}
          {upStats && (
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  variant="outline" 
                  className={cn("bg-gradient-to-r text-white border-0 gap-1", levelConfig.color)}
                >
                  <LevelIcon className="h-3 w-3" />
                  {levelConfig.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{upStats.total_points} UP • Nivel {levelConfig.label}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Org Badges */}
          {orgBadges.map((badge) => {
            const config = ORG_BADGE_CONFIG[badge.badge] || { 
              label: badge.badge, 
              icon: Award, 
              color: 'from-gray-500 to-gray-600' 
            };
            const BadgeIcon = config.icon;
            return (
              <Tooltip key={badge.id}>
                <TooltipTrigger>
                  <Badge 
                    variant="outline"
                    className={cn("bg-gradient-to-r text-white border-0 gap-1", config.color)}
                  >
                    <BadgeIcon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{config.label} - Nivel {badge.level}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Top 3 achievements */}
          {userAchievements.slice(0, 3).map((ua) => {
            const achievement = ua.achievement;
            if (!achievement) return null;
            const IconComponent = ICON_MAP[achievement.icon] || Shield;
            return (
              <Tooltip key={ua.id}>
                <TooltipTrigger>
                  <div className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center bg-gradient-to-br border",
                    RARITY_COLORS[achievement.rarity],
                    RARITY_BORDERS[achievement.rarity]
                  )}>
                    <IconComponent className="h-3.5 w-3.5 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{achievement.name}</p>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {userAchievements.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{userAchievements.length - 3}
            </Badge>
          )}
        </div>
      </TooltipProvider>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-card to-card/80">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Level indicator */}
            {upStats && (
              <div className={cn(
                "h-14 w-14 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg flex-shrink-0",
                levelConfig.color
              )}>
                <LevelIcon className="h-7 w-7 text-white" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={cn("font-bold", levelConfig.textColor)}>
                  {levelConfig.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {upStats?.total_points || 0} UP
                </span>
              </div>
              
              {/* Achievements summary */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {userAchievements.slice(0, 5).map((ua) => {
                    const achievement = ua.achievement;
                    if (!achievement) return null;
                    const IconComponent = ICON_MAP[achievement.icon] || Shield;
                    return (
                      <div 
                        key={ua.id}
                        className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center bg-gradient-to-br border-2 border-background",
                          RARITY_COLORS[achievement.rarity]
                        )}
                      >
                        <IconComponent className="h-3 w-3 text-white" />
                      </div>
                    );
                  })}
                </div>
                <span className="text-xs text-muted-foreground">
                  {progress.unlocked}/{progress.total} logros
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full variant
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-card/80 overflow-hidden">
      {/* Header */}
      <CardHeader className="border-b border-primary/10 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/20">
              <Trophy className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <CardTitle className="font-medieval text-lg flex items-center gap-2">
                Logros e Insignias
                <Sparkles className="w-4 h-4 text-amber-400" />
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {progress.unlocked} de {progress.total} desbloqueados
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-primary">{progress.percentage}%</span>
          </div>
        </div>
        <Progress value={progress.percentage} className="h-2 mt-3" />
      </CardHeader>

      <CardContent className="p-0">
        {/* Level & UP Stats Section */}
        {showLevelProgress && upStats && (
          <div className="p-4 border-b border-primary/10">
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-16 w-16 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg relative",
                levelConfig.color
              )}>
                <LevelIcon className="h-8 w-8 text-white" />
                {upStats.current_level === 'diamond' && (
                  <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-cyan-300 animate-pulse" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("text-lg font-bold", levelConfig.textColor)}>
                    Nivel {levelConfig.label}
                  </span>
                  <span className="font-bold text-foreground">{upStats.total_points} UP</span>
                </div>
                
                {upStats.current_level !== 'diamond' && (
                  <div className="space-y-1">
                    <Progress value={nextLevelInfo.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {nextLevelInfo.next - nextLevelInfo.current} UP para {LEVEL_CONFIG[nextLevelInfo.nextLevel as keyof typeof LEVEL_CONFIG].label}
                    </p>
                  </div>
                )}
                
                {upStats.current_level === 'diamond' && (
                  <p className="text-xs text-cyan-400">¡Has alcanzado el nivel máximo!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Organization Badges */}
        {showOrgBadges && orgBadges.length > 0 && (
          <div className="p-4 border-b border-primary/10">
            <p className="text-sm font-medium text-muted-foreground mb-3">Insignias Especiales</p>
            <div className="flex flex-wrap gap-2">
              {orgBadges.map((badge) => {
                const config = ORG_BADGE_CONFIG[badge.badge] || { 
                  label: badge.badge, 
                  icon: Award, 
                  color: 'from-gray-500 to-gray-600' 
                };
                const BadgeIcon = config.icon;
                const levelColor = badge.level === 'gold' 
                  ? 'from-yellow-500 to-amber-600' 
                  : badge.level === 'silver' 
                    ? 'from-slate-400 to-slate-500' 
                    : 'from-amber-600 to-amber-700';
                
                return (
                  <TooltipProvider key={badge.id}>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className={cn(
                          "px-4 py-2 rounded-xl flex items-center gap-2 bg-gradient-to-r shadow-lg cursor-pointer hover:scale-105 transition-transform",
                          levelColor
                        )}>
                          <BadgeIcon className="h-5 w-5 text-white" />
                          <div className="text-left">
                            <p className="text-sm font-bold text-white">{config.label}</p>
                            <p className="text-xs text-white/70 capitalize">{badge.level}</p>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Otorgado el {format(new Date(badge.granted_at), "d 'de' MMMM, yyyy", { locale: es })}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        )}

        {/* Achievements Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-primary/10 bg-transparent p-0 h-auto overflow-x-auto">
            <TabsTrigger 
              value="all" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Todos
            </TabsTrigger>
            {Object.entries(CATEGORY_CONFIG).map(([key, { label, icon: Icon }]) => (
              <TabsTrigger
                key={key}
                value={key}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 flex items-center gap-1.5"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="p-4 m-0">
            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 gap-3">
              {achievements.map(achievement => (
                <AchievementBadgeItem
                  key={achievement.id}
                  achievement={achievement}
                  isUnlocked={isUnlocked(achievement.id)}
                  unlockedAt={getUnlockedDate(achievement.id)}
                />
              ))}
            </div>
          </TabsContent>

          {Object.entries(CATEGORY_CONFIG).map(([categoryKey, { label, description }]) => (
            <TabsContent key={categoryKey} value={categoryKey} className="p-4 m-0">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medieval text-lg text-foreground">{label}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(groupedAchievements[categoryKey] || []).map(achievement => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      isUnlocked={isUnlocked(achievement.id)}
                      unlockedAt={getUnlockedDate(achievement.id)}
                    />
                  ))}
                  {(!groupedAchievements[categoryKey] || groupedAchievements[categoryKey].length === 0) && (
                    <p className="text-sm text-muted-foreground col-span-full text-center py-8">
                      No hay logros en esta categoría
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Sub-components
function AchievementBadgeItem({ 
  achievement, 
  isUnlocked, 
  unlockedAt 
}: { 
  achievement: Achievement; 
  isUnlocked: boolean; 
  unlockedAt: string | null;
}) {
  const IconComponent = ICON_MAP[achievement.icon] || Shield;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'relative w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all duration-300',
              isUnlocked ? [
                'bg-gradient-to-br',
                RARITY_COLORS[achievement.rarity],
                RARITY_BORDERS[achievement.rarity],
                'shadow-lg hover:scale-110 cursor-pointer'
              ] : [
                'bg-muted/30 border-muted-foreground/20',
                'grayscale opacity-50'
              ]
            )}
          >
            {isUnlocked && achievement.rarity === 'legendary' && (
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-400/30 to-orange-500/30 blur-md -z-10" />
            )}
            
            <IconComponent 
              size={24} 
              className={cn(
                'drop-shadow-md',
                isUnlocked ? 'text-white' : 'text-muted-foreground/50'
              )} 
            />
            
            {!isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/50">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{achievement.name}</span>
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                achievement.rarity === 'legendary' && 'bg-amber-500/20 text-amber-400',
                achievement.rarity === 'rare' && 'bg-blue-500/20 text-blue-400',
                achievement.rarity === 'uncommon' && 'bg-emerald-500/20 text-emerald-400',
                achievement.rarity === 'common' && 'bg-stone-500/20 text-stone-400',
              )}>
                {RARITY_LABELS[achievement.rarity]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{achievement.description}</p>
            {isUnlocked && unlockedAt && (
              <p className="text-xs text-primary">
                Desbloqueado: {format(new Date(unlockedAt), "d 'de' MMMM, yyyy", { locale: es })}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function AchievementCard({ 
  achievement, 
  isUnlocked, 
  unlockedAt 
}: { 
  achievement: Achievement; 
  isUnlocked: boolean; 
  unlockedAt: string | null;
}) {
  const IconComponent = ICON_MAP[achievement.icon] || Shield;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all',
        isUnlocked
          ? 'bg-primary/5 border-primary/20'
          : 'bg-muted/20 border-muted/20 opacity-60'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          isUnlocked ? [
            'bg-gradient-to-br',
            RARITY_COLORS[achievement.rarity]
          ] : 'bg-muted'
        )}
      >
        <IconComponent 
          size={16} 
          className={cn(isUnlocked ? 'text-white' : 'text-muted-foreground')} 
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-medium text-sm truncate',
          isUnlocked ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {achievement.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {achievement.description}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn(
            'text-xs',
            achievement.rarity === 'legendary' && 'text-amber-400',
            achievement.rarity === 'rare' && 'text-blue-400',
            achievement.rarity === 'uncommon' && 'text-emerald-400',
            achievement.rarity === 'common' && 'text-stone-400',
          )}>
            {RARITY_LABELS[achievement.rarity]}
          </span>
          {isUnlocked && unlockedAt && (
            <span className="text-xs text-primary">
              • {format(new Date(unlockedAt), "d MMM yyyy", { locale: es })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default UnifiedBadgesShowcase;
