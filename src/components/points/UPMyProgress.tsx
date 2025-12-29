import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Zap, Trophy, Flame, TrendingUp, Clock, Target, 
  CheckCircle2, XCircle, Star, Crown, Award,
  Sparkles, Brain
} from 'lucide-react';
import { useUserPoints, usePointsHistory } from '@/hooks/useUserPoints';
import { useUserQuests } from '@/hooks/useUPEngine';
import { useAchievements } from '@/hooks/useAchievements';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface UPMyProgressProps {
  userId: string;
}

const LEVEL_ICONS = {
  bronze: '⚔️',
  silver: '🛡️',
  gold: '👑',
  diamond: '🏰'
};

const LEVEL_LABELS = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  diamond: 'Diamante'
};

const TRANSACTION_ICONS: Record<string, { icon: any; color: string }> = {
  base_completion: { icon: CheckCircle2, color: 'text-success' },
  early_delivery: { icon: TrendingUp, color: 'text-cyan-400' },
  late_delivery: { icon: Clock, color: 'text-destructive' },
  perfect_streak: { icon: Flame, color: 'text-orange-500' },
  five_star_rating: { icon: Star, color: 'text-yellow-500' },
  correction_needed: { icon: XCircle, color: 'text-destructive' },
  manual_adjustment: { icon: Zap, color: 'text-primary' },
  quest_completion: { icon: Target, color: 'text-purple-500' },
  achievement_bonus: { icon: Award, color: 'text-amber-500' }
};

export function UPMyProgress({ userId }: UPMyProgressProps) {
  const { 
    points, 
    loading: pointsLoading,
    getProgressToNextLevel,
    LEVEL_COLORS,
    LEVEL_BG_COLORS
  } = useUserPoints(userId);

  const { history, loading: historyLoading } = usePointsHistory(userId);
  const { quests, loading: questsLoading } = useUserQuests(userId);
  const { userAchievements, achievements, loading: achievementsLoading } = useAchievements(userId);

  const loading = pointsLoading || historyLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const level = points?.current_level || 'bronze';
  const { progress, nextLevel, pointsNeeded } = getProgressToNextLevel();
  const streak = points?.consecutive_on_time || 0;
  const totalPoints = points?.total_points || 0;

  // Get next 3 achievements
  const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id));
  const nextAchievements = achievements
    .filter(a => !unlockedIds.has(a.id))
    .slice(0, 3);

  // Active quests - filter by is_active
  const activeQuests = quests.filter(q => q.is_active).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Main Stats Card */}
      <Card className={cn(
        "border-2 bg-gradient-to-br overflow-hidden",
        LEVEL_BG_COLORS[level]
      )}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Level Badge */}
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-20 w-20 rounded-full flex items-center justify-center text-4xl",
                "bg-background/50 border-2",
                LEVEL_BG_COLORS[level]
              )}>
                {LEVEL_ICONS[level]}
              </div>
              <div>
                <h2 className={cn("text-3xl font-bold", LEVEL_COLORS[level])}>
                  {totalPoints} UP
                </h2>
                <p className={cn("text-lg font-medium", LEVEL_COLORS[level])}>
                  {LEVEL_LABELS[level]}
                </p>
              </div>
            </div>

            {/* Progress to Next Level */}
            <div className="flex-1 space-y-2">
              {level !== 'diamond' ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      Próximo: {LEVEL_LABELS[nextLevel]}
                    </span>
                    <span className="font-medium">{pointsNeeded} UP restantes</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </>
              ) : (
                <div className="flex items-center gap-2 text-cyan-400 bg-cyan-400/10 p-3 rounded-lg border border-cyan-400/30">
                  <Crown className="w-5 h-5" />
                  <span className="font-medium">¡Has alcanzado el nivel máximo!</span>
                </div>
              )}
            </div>

            {/* Streak */}
            {streak > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 rounded-lg border border-orange-500/30">
                <Flame className="w-6 h-6 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold text-orange-500">{streak}</p>
                  <p className="text-xs text-orange-400">Racha</p>
                </div>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/50">
            <div className="text-center">
              <p className="text-2xl font-bold">{points?.total_completions || 0}</p>
              <p className="text-xs text-muted-foreground">Completados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{points?.total_on_time || 0}</p>
              <p className="text-xs text-muted-foreground">A tiempo</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{points?.total_late || 0}</p>
              <p className="text-xs text-muted-foreground">Tardíos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{points?.total_corrections || 0}</p>
              <p className="text-xs text-muted-foreground">Correcciones</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Quests */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-purple-500" />
              Misiones Activas
            </CardTitle>
            <CardDescription>Completa misiones para ganar UP extra</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeQuests.length > 0 ? (
              activeQuests.map(quest => {
                const currentProgress = quest.progress?.current_value || 0;
                const targetValue = quest.goal_value || 1;
                
                return (
                  <div 
                    key={quest.id}
                    className="p-3 rounded-lg border bg-gradient-to-r from-purple-500/10 to-transparent"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{quest.title}</h4>
                        <p className="text-sm text-muted-foreground">{quest.description}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        +{quest.reward_points} UP
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progreso</span>
                        <span>{currentProgress} / {targetValue}</span>
                      </div>
                      <Progress 
                        value={(currentProgress / targetValue) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No hay misiones activas</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Achievements */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="w-5 h-5 text-amber-500" />
              Próximos Logros
            </CardTitle>
            <CardDescription>Desbloquea logros para ganar recompensas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextAchievements.length > 0 ? (
              nextAchievements.map(achievement => (
                <div 
                  key={achievement.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="h-10 w-10 rounded-full flex items-center justify-center text-xl bg-muted">
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{achievement.name}</h4>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  </div>
                  <Badge 
                    variant="outline"
                    className={cn(
                      achievement.rarity === 'legendary' && 'border-amber-500 text-amber-500',
                      achievement.rarity === 'rare' && 'border-cyan-500 text-cyan-500',
                      achievement.rarity === 'uncommon' && 'border-purple-500 text-purple-500'
                    )}
                  >
                    {achievement.rarity}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>¡Has desbloqueado todos los logros!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Points Timeline */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Historial de Puntos
          </CardTitle>
          <CardDescription>
            Explicación detallada de cómo ganaste o perdiste UP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {history.length > 0 ? (
                history.map((transaction) => {
                  const typeInfo = TRANSACTION_ICONS[transaction.transaction_type] || 
                    { icon: Zap, color: 'text-muted-foreground' };
                  const Icon = typeInfo.icon;
                  const isPositive = transaction.points > 0;

                  return (
                    <div 
                      key={transaction.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                        isPositive ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg",
                        isPositive ? "bg-success/20" : "bg-destructive/20"
                      )}>
                        <Icon className={cn("w-4 h-4", typeInfo.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">
                            {transaction.description || transaction.transaction_type}
                          </p>
                          <span className={cn(
                            "font-bold shrink-0",
                            isPositive ? "text-success" : "text-destructive"
                          )}>
                            {isPositive ? '+' : ''}{transaction.points} UP
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatDistanceToNow(new Date(transaction.created_at), { 
                              addSuffix: true, 
                              locale: es 
                            })}
                          </span>
                        </div>
                        {/* AI Explanation */}
                        <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Brain className="w-3 h-3" />
                            <span>Explicación IA:</span>
                          </div>
                          <p className="text-foreground/80">
                            {getAIExplanation(transaction)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Aún no tienes transacciones de puntos</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to generate AI explanation for transactions
function getAIExplanation(transaction: any): string {
  const type = transaction.transaction_type;
  const points = transaction.points;

  const explanations: Record<string, string> = {
    base_completion: `Ganaste ${points} UP por completar una entrega. Cada entrega completada suma puntos base a tu nivel.`,
    early_delivery: `¡Excelente! Recibiste ${points} UP extra por entregar antes del deadline. Las entregas anticipadas acumulan bonificaciones.`,
    late_delivery: `Perdiste ${Math.abs(points)} UP por entregar después del deadline. Intenta entregar a tiempo para mantener tu racha.`,
    perfect_streak: `¡Racha perfecta! Ganaste ${points} UP por mantener entregas consecutivas a tiempo. Sigue así para más bonificaciones.`,
    five_star_rating: `Recibiste ${points} UP por una aprobación sin correcciones. La calidad de tu trabajo se refleja en tus puntos.`,
    correction_needed: `Perdiste ${Math.abs(points)} UP porque se solicitaron correcciones. Revisa el feedback para mejorar.`,
    manual_adjustment: `Un administrador ajustó tus puntos. ${points > 0 ? 'Esto puede ser por logros especiales o reconocimientos.' : 'Consulta con tu equipo para más detalles.'}`,
    quest_completion: `¡Misión completada! Ganaste ${points} UP por cumplir un objetivo especial.`,
    achievement_bonus: `Desbloqueaste un logro y ganaste ${points} UP como recompensa.`
  };

  return explanations[type] || `Transacción de ${points > 0 ? '+' : ''}${points} UP registrada en el sistema.`;
}
