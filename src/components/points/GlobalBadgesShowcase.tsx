import { useState, useMemo } from 'react';
import { Award, Lock, Star, CheckCircle, ChevronRight, Filter, Search, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  useGlobalBadges,
  GlobalBadge,
  BadgeCategory,
  BADGE_RARITY_COLORS,
  BADGE_RARITY_LABELS,
  BADGE_RARITY_BORDERS,
  BADGE_CATEGORY_LABELS,
  BADGE_CATEGORY_ICONS
} from '@/hooks/useGlobalBadges';
import { useAuth } from '@/hooks/useAuth';
import * as LucideIcons from 'lucide-react';

interface GlobalBadgesShowcaseProps {
  userId?: string;
  showProgress?: boolean;
  showStats?: boolean;
  compact?: boolean;
  maxPerCategory?: number;
  className?: string;
  onBadgeClick?: (badge: GlobalBadge) => void;
}

function BadgeIcon({ iconName, className }: { iconName: string; className?: string }) {
  const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[
    iconName.split('-').map((s, i) => i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)).join('')
  ] || Award;

  return <IconComponent className={className} />;
}

function SingleBadge({
  badge,
  isUnlocked,
  progress,
  onClick,
  showProgress
}: {
  badge: GlobalBadge;
  isUnlocked: boolean;
  progress: { current: number; max: number; percentage: number };
  onClick?: () => void;
  showProgress: boolean;
}) {
  const isSecret = badge.is_secret && !isUnlocked;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              'relative flex flex-col items-center p-3 rounded-xl transition-all duration-300',
              'border-2 hover:scale-105',
              isUnlocked
                ? cn(
                    'bg-gradient-to-br',
                    BADGE_RARITY_COLORS[badge.rarity],
                    BADGE_RARITY_BORDERS[badge.rarity]
                  )
                : 'bg-muted/50 border-muted-foreground/20 hover:border-muted-foreground/40',
              isSecret && 'opacity-60'
            )}
            disabled={isSecret}
          >
            {/* Icono */}
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center mb-2',
                isUnlocked
                  ? 'bg-white/20 text-white'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {isSecret ? (
                <Lock className="w-5 h-5" />
              ) : (
                <BadgeIcon iconName={badge.icon} className="w-6 h-6" />
              )}
            </div>

            {/* Nombre */}
            <p
              className={cn(
                'text-xs font-medium text-center truncate w-full',
                isUnlocked ? 'text-white' : 'text-muted-foreground'
              )}
            >
              {isSecret ? '???' : badge.name}
            </p>

            {/* Indicador de desbloqueo */}
            {isUnlocked && (
              <div className="absolute -top-1 -right-1">
                <CheckCircle className="w-5 h-5 text-green-400 bg-background rounded-full" />
              </div>
            )}

            {/* Barra de progreso */}
            {showProgress && !isUnlocked && progress.current > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b-xl overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {isSecret ? (
            <p>Insignia secreta - Descubrela completando acciones especiales</p>
          ) : (
            <div className="space-y-1">
              <p className="font-semibold">{badge.name}</p>
              <p className="text-sm text-muted-foreground">{badge.description}</p>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className={cn('text-xs', BADGE_RARITY_COLORS[badge.rarity])}>
                  {BADGE_RARITY_LABELS[badge.rarity]}
                </Badge>
                <span>+{badge.ranking_points} pts</span>
              </div>
              {showProgress && !isUnlocked && progress.current > 0 && (
                <p className="text-xs text-primary">
                  Progreso: {progress.current}/{progress.max} ({progress.percentage}%)
                </p>
              )}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function GlobalBadgesShowcase({
  userId,
  showProgress = true,
  showStats = true,
  compact = false,
  maxPerCategory,
  className,
  onBadgeClick
}: GlobalBadgesShowcaseProps) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  const {
    badges,
    loading,
    isUnlocked,
    getBadgeProgress,
    getBadgesByCategory,
    getOverallProgress,
    getRecentlyUnlocked,
    BADGE_CATEGORY_LABELS: categoryLabels,
    BADGE_CATEGORY_ICONS: categoryIcons
  } = useGlobalBadges(targetUserId);

  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyLocked, setShowOnlyLocked] = useState(false);

  const progress = getOverallProgress();
  const badgesByCategory = getBadgesByCategory();
  const recentlyUnlocked = getRecentlyUnlocked(3);

  // Filtrar badges
  const filteredBadges = useMemo(() => {
    let result: GlobalBadge[] = [];

    if (selectedCategory === 'all') {
      result = badges.filter(b => !b.is_secret || isUnlocked(b.id));
    } else {
      result = badgesByCategory[selectedCategory] || [];
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b =>
        b.name.toLowerCase().includes(query) ||
        b.description.toLowerCase().includes(query)
      );
    }

    if (showOnlyLocked) {
      result = result.filter(b => !isUnlocked(b.id));
    }

    if (maxPerCategory && selectedCategory === 'all') {
      // Limitar por categoria
      const limited: GlobalBadge[] = [];
      const categoryCounts: Record<string, number> = {};

      for (const badge of result) {
        const count = categoryCounts[badge.category] || 0;
        if (count < maxPerCategory) {
          limited.push(badge);
          categoryCounts[badge.category] = count + 1;
        }
      }
      result = limited;
    }

    return result;
  }, [badges, selectedCategory, badgesByCategory, searchQuery, showOnlyLocked, maxPerCategory, isUnlocked]);

  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-purple-500/10 to-amber-500/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Coleccion de Insignias
          </CardTitle>

          {showStats && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                {progress.completed}/{progress.total}
              </span>
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">
                {progress.points} pts
              </Badge>
            </div>
          )}
        </div>

        {/* Barra de progreso general */}
        {showStats && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progreso total</span>
              <span className="font-medium">{progress.percentage}%</span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Insignias recientes */}
        {!compact && recentlyUnlocked.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-green-500" />
              Desbloqueadas recientemente
            </h4>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recentlyUnlocked.map(ub => (
                <SingleBadge
                  key={ub.id}
                  badge={ub.badge!}
                  isUnlocked={true}
                  progress={{ current: 0, max: 0, percentage: 100 }}
                  onClick={() => onBadgeClick?.(ub.badge!)}
                  showProgress={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Filtros */}
        {!compact && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar insignias..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showOnlyLocked ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowOnlyLocked(!showOnlyLocked)}
            >
              <Lock className="w-4 h-4 mr-1" />
              Solo bloqueadas
            </Button>
          </div>
        )}

        {/* Tabs de categorias */}
        <Tabs
          value={selectedCategory}
          onValueChange={(v) => setSelectedCategory(v as BadgeCategory | 'all')}
        >
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="all" className="text-xs px-2 py-1">
              Todas
            </TabsTrigger>
            {(Object.keys(categoryLabels) as BadgeCategory[]).map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-xs px-2 py-1">
                {categoryLabels[cat]}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Grid de insignias */}
          <div className="mt-4">
            {filteredBadges.length === 0 ? (
              <div className="py-12 text-center">
                <Award className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No se encontraron insignias</p>
              </div>
            ) : (
              <div
                className={cn(
                  'grid gap-3',
                  compact
                    ? 'grid-cols-4 sm:grid-cols-6'
                    : 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8'
                )}
              >
                {filteredBadges.map(badge => (
                  <SingleBadge
                    key={badge.id}
                    badge={badge}
                    isUnlocked={isUnlocked(badge.id)}
                    progress={getBadgeProgress(badge.id)}
                    onClick={() => onBadgeClick?.(badge)}
                    showProgress={showProgress}
                  />
                ))}
              </div>
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default GlobalBadgesShowcase;
