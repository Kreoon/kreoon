import React from 'react';
import { Shield, Trophy, Flame, Star, Swords, Crown, Castle } from 'lucide-react';
import { useAchievements, RARITY_LABELS } from '@/hooks/useAchievements';
import { AchievementBadge } from './AchievementBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ComponentType<any> }> = {
  completion: { label: 'Conquistas', icon: Swords },
  punctuality: { label: 'Velocidad', icon: Flame },
  streak: { label: 'Rachas', icon: Crown },
  points: { label: 'Tesoros', icon: Star },
  special: { label: 'Especiales', icon: Castle },
  level: { label: 'Ascensos', icon: Shield },
};

interface AchievementsShowcaseProps {
  userId: string;
}

export const AchievementsShowcase: React.FC<AchievementsShowcaseProps> = ({ userId }) => {
  const { 
    achievements, 
    loading, 
    isUnlocked, 
    getUnlockedDate,
    getAchievementsByCategory, 
    getProgress 
  } = useAchievements(userId);

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

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-card/80 overflow-hidden">
      {/* Header con progreso */}
      <CardHeader className="border-b border-primary/10 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/20">
              <Trophy className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <CardTitle className="font-medieval text-lg">Sala de Trofeos</CardTitle>
              <p className="text-sm text-muted-foreground">
                {progress.unlocked} de {progress.total} insignias desbloqueadas
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
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-primary/10 bg-transparent p-0 h-auto overflow-x-auto">
            <TabsTrigger 
              value="all" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Todas
            </TabsTrigger>
            {Object.entries(CATEGORY_LABELS).map(([key, { label, icon: Icon }]) => (
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
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  isUnlocked={isUnlocked(achievement.id)}
                  unlockedAt={getUnlockedDate(achievement.id)}
                  size="md"
                />
              ))}
            </div>
          </TabsContent>

          {Object.entries(CATEGORY_LABELS).map(([categoryKey, { label }]) => (
            <TabsContent key={categoryKey} value={categoryKey} className="p-4 m-0">
              <div className="space-y-4">
                <h3 className="font-medieval text-lg text-foreground flex items-center gap-2">
                  {label}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(groupedAchievements[categoryKey] || []).map(achievement => (
                    <div
                      key={achievement.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-all',
                        isUnlocked(achievement.id)
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-muted/20 border-muted/20 opacity-60'
                      )}
                    >
                      <AchievementBadge
                        achievement={achievement}
                        isUnlocked={isUnlocked(achievement.id)}
                        unlockedAt={getUnlockedDate(achievement.id)}
                        size="sm"
                        showTooltip={false}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-medium text-sm truncate',
                          isUnlocked(achievement.id) ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {achievement.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {achievement.description}
                        </p>
                        <span className={cn(
                          'text-xs',
                          achievement.rarity === 'legendary' && 'text-amber-400',
                          achievement.rarity === 'rare' && 'text-blue-400',
                          achievement.rarity === 'uncommon' && 'text-emerald-400',
                          achievement.rarity === 'common' && 'text-stone-400',
                        )}>
                          {RARITY_LABELS[achievement.rarity]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
