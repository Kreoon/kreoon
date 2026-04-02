import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import {
  useOrgRanking,
  useUserReputation,
  useUserEvents,
  useReputationSeasons,
  useRoleArchetypes,
} from '@/hooks/useUnifiedReputation';
import { LEVEL_META, ARCHETYPE_META } from '@/lib/reputation/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy, Medal, Zap, Crown, Flame, Target, Users, History,
  Award, Calendar, Shield, Castle, TrendingUp,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { UnifiedBadgesShowcase } from '@/components/points/UnifiedBadgesShowcase';
import { SeasonManager } from '@/components/points/SeasonManager';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { RankingEntry, UserReputationTotals } from '@/lib/reputation/types';

const RANK_STYLES = [
  { icon: Crown, color: 'text-yellow-500', bg: 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/10 border-yellow-500/50' },
  { icon: Medal, color: 'text-slate-400', bg: 'bg-gradient-to-br from-slate-400/30 to-slate-500/10 border-slate-400/50' },
  { icon: Award, color: 'text-amber-600', bg: 'bg-gradient-to-br from-amber-600/30 to-amber-700/10 border-amber-600/50' },
];

const ROLE_LABEL: Record<string, string> = {
  creator: 'Creadores',
  editor: 'Editores',
  strategist: 'Estrategas',
  trafficker: 'Traffickers',
  community_manager: 'Community',
  photographer: 'Fotografos',
  animator_2d: 'Animadores 2D',
  designer: 'Disenadores',
  copywriter: 'Copywriters',
};

const ROLE_ICON: Record<string, string> = {
  creator: '🎬',
  editor: '✂️',
  strategist: '🎯',
  trafficker: '📊',
  community_manager: '💬',
  photographer: '📷',
  animator_2d: '🎨',
  designer: '🖌️',
  copywriter: '✍️',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  delivery: 'Entrega',
  issue: 'Novedad',
  recovery: 'Recuperacion',
  approval: 'Aprobacion',
  task_completed: 'Tarea completada',
  manual_adjustment: 'Ajuste manual',
  streak: 'Racha',
  bonus: 'Bonus',
};

const EVENT_SUBTYPE_LABELS: Record<string, string> = {
  early_delivery: 'Entrega temprana',
  on_time_delivery: 'A tiempo',
  delivery_day2: 'Dia 2',
  delivery_day3: 'Dia 3',
  slight_delay: 'Ligero retraso',
  late_delivery: 'Retraso',
  issue_penalty: 'Penalizacion',
  issue_recovery: 'Recuperacion',
  clean_approval_bonus: 'Aprobacion limpia',
  reassignment_penalty: 'Reasignacion',
};

type SortKey = 'lifetime' | 'season';

export default function RankingPage() {
  const { user, isAdmin } = useAuth();
  const { currentOrgId } = useOrgOwner();
  const [sortBy, setSortBy] = useState<SortKey>('lifetime');

  // Fetch ALL ranking data once (unfiltered) — we group by role client-side
  const { ranking: allRanking, loading: loadingRanking } = useOrgRanking(currentOrgId ?? undefined);
  const { scores: myScores, primaryScore, loading: loadingMyScores } = useUserReputation(user?.id, currentOrgId ?? undefined);
  const { events: myEvents, loading: loadingEvents } = useUserEvents(user?.id, currentOrgId ?? undefined);
  const { seasons, activeSeason } = useReputationSeasons(currentOrgId ?? undefined);
  const { archetypes } = useRoleArchetypes(currentOrgId ?? undefined);

  const loading = loadingRanking || loadingMyScores;

  // Group ranking data by role
  const { roleGroups, roleKeys } = useMemo(() => {
    const groups: Record<string, RankingEntry[]> = {};
    allRanking.forEach(entry => {
      const role = entry.role_key || 'other';
      if (!groups[role]) groups[role] = [];
      groups[role].push(entry);
    });
    // Sort each group
    Object.values(groups).forEach(group => {
      group.sort((a, b) => {
        const valA = sortBy === 'season' ? a.season_points : a.lifetime_points;
        const valB = sortBy === 'season' ? b.season_points : b.lifetime_points;
        return valB - valA;
      });
    });
    const keys = Object.keys(groups).sort((a, b) => {
      // Sort roles by total points (most active first)
      const totalA = groups[a].reduce((s, e) => s + e.lifetime_points, 0);
      const totalB = groups[b].reduce((s, e) => s + e.lifetime_points, 0);
      return totalB - totalA;
    });
    return { roleGroups: groups, roleKeys: keys };
  }, [allRanking, sortBy]);

  // Stats
  const totalPoints = allRanking.reduce((sum, e) => sum + e.lifetime_points, 0);
  const uniqueUsers = useMemo(() => new Set(allRanking.map(e => e.user_id)).size, [allRanking]);

  // Default role tab to the first role with data
  const defaultRoleTab = roleKeys[0] || 'creator';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Castle}
        title="Kreoon Ranking"
        subtitle="Sistema de Tokens IA y clasificacion por rol"
      />

      <Tabs defaultValue="ranking" className="space-y-6">
        <TabsList className={cn(
          'grid w-full lg:w-auto lg:inline-grid bg-secondary/50 border border-border',
          isAdmin ? 'grid-cols-5' : 'grid-cols-4',
        )}>
          <TabsTrigger value="ranking" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Ranking</span>
          </TabsTrigger>
          <TabsTrigger value="my-stats" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Mis Puntos</span>
          </TabsTrigger>
          <TabsTrigger value="seasons" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Temporadas</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Logros</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Historial</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ─── Ranking Tab ─── */}
        <TabsContent value="ranking" className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border border-primary/30 bg-primary/5">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-sm bg-primary/10 border border-primary/20">
                  <Flame className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Tokens IA</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-green-400/30 bg-green-400/5">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-sm bg-green-400/10 border border-green-400/20">
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{uniqueUsers}</p>
                  <p className="text-xs text-muted-foreground">Miembros activos</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-purple-400/30 bg-purple-400/5">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-sm bg-purple-400/10 border border-purple-400/20">
                  <Trophy className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">{roleKeys.length}</p>
                  <p className="text-xs text-muted-foreground">Roles activos</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sort toggle + Season indicator */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-secondary/50 rounded-sm p-1 border border-border">
              {[
                { value: 'lifetime' as SortKey, label: 'Puntos totales' },
                { value: 'season' as SortKey, label: 'Temporada actual' },
              ].map(so => (
                <button
                  key={so.value}
                  onClick={() => setSortBy(so.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-sm text-xs font-medium transition-colors',
                    sortBy === so.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {so.label}
                </button>
              ))}
            </div>
            {activeSeason && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-yellow-500/10 border border-yellow-500/20 text-xs">
                <Calendar className="h-3 w-3 text-yellow-500" />
                <span className="text-yellow-500 font-medium">{activeSeason.name}</span>
              </div>
            )}
          </div>

          {/* Role-separated leaderboards */}
          {roleKeys.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Sin datos de ranking</p>
                  <p className="text-sm">Completa tareas para aparecer en el ranking</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue={defaultRoleTab} className="space-y-4">
              <TabsList className="bg-secondary/50 border border-border inline-flex w-auto">
                {roleKeys.map(role => (
                  <TabsTrigger
                    key={role}
                    value={role}
                    className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <span>{ROLE_ICON[role] || '📋'}</span>
                    <span>{ROLE_LABEL[role] || role}</span>
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                      {roleGroups[role].length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>

              {roleKeys.map(role => (
                <TabsContent key={role} value={role}>
                  <RoleLeaderboard
                    entries={roleGroups[role]}
                    sortBy={sortBy}
                    currentUserId={user?.id}
                    roleName={ROLE_LABEL[role] || role}
                    activeSeason={activeSeason}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </TabsContent>

        {/* ─── My Stats Tab ─── */}
        <TabsContent value="my-stats" className="space-y-6">
          {user && primaryScore ? (
            <>
              {/* Primary score card */}
              <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-sm bg-primary/20 border border-primary/30 flex items-center justify-center text-3xl">
                      {LEVEL_META[primaryScore.current_level]?.icon || '🌱'}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold">{primaryScore.lifetime_points.toLocaleString()} Tokens IA</h3>
                      <p className="text-muted-foreground text-sm">
                        Nivel: <span className="font-medium text-foreground">{primaryScore.current_level}</span>
                        {' '} | Progreso: {Math.round(primaryScore.current_level_progress)}%
                      </p>
                      <div className="mt-2 w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${Math.min(primaryScore.current_level_progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Flame} label="Temporada" value={primaryScore.season_points} color="text-orange-400" />
                <StatCard icon={TrendingUp} label="Ultimos 30d" value={primaryScore.rolling_30d_points} color="text-blue-400" />
                <StatCard icon={Target} label="A tiempo" value={`${Math.round(primaryScore.on_time_rate * 100)}%`} color="text-green-400" />
                <StatCard icon={Shield} label="Racha" value={`${primaryScore.current_streak_days}d`} color="text-purple-400" />
              </div>

              {/* Per-role breakdown */}
              {myScores.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4" />
                      Puntos por Rol
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {myScores.map(score => (
                        <RoleScoreRow key={score.role_key} score={score} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent events */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <History className="h-4 w-4" />
                    Actividad Reciente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EventsList events={myEvents} loading={loadingEvents} />
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Sin puntos aun</p>
              <p className="text-sm">Completa tareas para empezar a ganar Tokens IA</p>
            </div>
          )}
        </TabsContent>

        {/* ─── Seasons Tab ─── */}
        <TabsContent value="seasons" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {isAdmin && <SeasonManager showCreateButton />}
            <div className={cn(isAdmin ? 'lg:col-span-2' : 'lg:col-span-3')}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-yellow-500" />
                    Temporadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {seasons.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">No hay temporadas registradas</p>
                  ) : (
                    <div className="space-y-3">
                      {seasons.map(season => (
                        <div key={season.id} className={cn(
                          'flex items-center justify-between p-4 rounded-sm border',
                          season.is_active ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border',
                        )}>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{season.name}</p>
                              {season.is_active && (
                                <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Activa</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(season.start_date), 'd MMM yyyy', { locale: es })} — {format(new Date(season.end_date), 'd MMM yyyy', { locale: es })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── Achievements Tab ─── */}
        <TabsContent value="achievements" className="space-y-6">
          {user && <UnifiedBadgesShowcase userId={user.id} variant="full" />}
        </TabsContent>

        {/* ─── History Tab (Admin) ─── */}
        {isAdmin && (
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historial de Actividad Global
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EventsList events={myEvents} loading={loadingEvents} showUserName />
              </CardContent>
            </Card>

            {/* Level distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Distribucion de Niveles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(LEVEL_META).map(([level, meta]) => {
                  const count = allRanking.filter(e => e.current_level === level).length;
                  const pct = allRanking.length > 0 ? (count / allRanking.length) * 100 : 0;
                  return (
                    <div key={level} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          {meta.icon} {level}
                        </span>
                        <span className="font-medium">{count} miembros</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: meta.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Archetype distribution */}
            {archetypes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Roles Activos ({archetypes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {archetypes.map(arch => {
                      const meta = ARCHETYPE_META[arch.archetype];
                      return (
                        <div key={arch.id} className="p-3 rounded-sm border bg-card">
                          <div className="flex items-center gap-2 mb-1">
                            <span>{meta?.icon || '📋'}</span>
                            <span className="text-sm font-medium truncate">{arch.role_display_name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{meta?.label || arch.archetype}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Peso: {arch.base_weight} | x{arch.complexity_multiplier}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ─── Role Leaderboard ────────────────────────────────────

function RoleLeaderboard({
  entries,
  sortBy,
  currentUserId,
  roleName,
  activeSeason,
}: {
  entries: RankingEntry[];
  sortBy: SortKey;
  currentUserId?: string;
  roleName: string;
  activeSeason?: { name: string; start_date: string; end_date: string } | null;
}) {
  const currentUserRank = entries.findIndex(e => e.user_id === currentUserId) + 1;
  const displayPoints = entries.reduce((s, e) => s + (sortBy === 'season' ? e.season_points : e.lifetime_points), 0);
  // Detect if season data equals lifetime (system just launched)
  const seasonEqualsLifetime = sortBy === 'season' && entries.every(e => e.season_points === e.lifetime_points);

  return (
    <Card className={cn('border-2', sortBy === 'season' ? 'border-yellow-500/30' : 'border-border')}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            {sortBy === 'season' ? (
              <Calendar className="w-5 h-5 text-yellow-500" />
            ) : (
              <Trophy className="w-5 h-5 text-yellow-500" />
            )}
            {sortBy === 'season' ? (
              <span>{activeSeason?.name || 'Temporada'} — {roleName}</span>
            ) : (
              <span>Ranking {roleName}</span>
            )}
          </CardTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {currentUserRank > 0 && (
              <Badge variant="outline" className="gap-1">
                <Trophy className="w-3 h-3" /> #{currentUserRank}
              </Badge>
            )}
            <span>{displayPoints.toLocaleString()} coins</span>
          </div>
        </div>
        {sortBy === 'season' && activeSeason && (
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(activeSeason.start_date), 'd MMM', { locale: es })} — {format(new Date(activeSeason.end_date), 'd MMM yyyy', { locale: es })}
          </p>
        )}
        {seasonEqualsLifetime && (
          <p className="text-xs text-yellow-500/80 mt-2">
            El sistema de puntos inicio en esta temporada. Los datos se diferenciaran a partir de la proxima.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const rank = idx + 1;
            const isCurrentUser = entry.user_id === currentUserId;
            const rankStyle = RANK_STYLES[rank - 1];
            const levelMeta = LEVEL_META[entry.current_level] || LEVEL_META['Novato'];
            const displayPoints = sortBy === 'season' ? entry.season_points : entry.lifetime_points;

            return (
              <div
                key={entry.user_id}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-sm transition-colors border',
                  isCurrentUser ? 'bg-primary/15 border-primary/40' : 'hover:bg-muted/50 border-transparent',
                  rank <= 3 && 'border-2',
                )}
              >
                {/* Rank */}
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                  rank <= 3 ? rankStyle?.bg : 'bg-muted border border-border',
                )}>
                  {rank <= 3 && rankStyle ? (
                    <rankStyle.icon className={cn('w-5 h-5', rankStyle.color)} />
                  ) : (
                    <span className="text-muted-foreground">{rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <Avatar className="h-10 w-10 flex-shrink-0 border-2 border-border">
                  <AvatarImage src={entry.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {(entry.full_name || '??').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Name & Level */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{entry.full_name || 'Usuario'}</p>
                    {isCurrentUser && <Badge variant="outline" className="text-xs">Tu</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{levelMeta.icon} {entry.current_level}</span>
                    <span className="text-xs">{entry.lifetime_tasks} tareas</span>
                    {entry.current_streak_days > 0 && (
                      <span className="text-xs text-orange-400 flex items-center gap-0.5">
                        <Flame className="h-3 w-3" />{entry.current_streak_days}d
                      </span>
                    )}
                  </div>
                </div>

                {/* On-time rate */}
                <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                  <Target className="h-3 w-3" />
                  {Math.round(entry.on_time_rate * 100)}%
                </div>

                {/* Points */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm border bg-primary/5 border-primary/20">
                  <Flame className="w-4 h-4 text-primary" />
                  <span className="font-bold text-primary">
                    {Math.round(displayPoints).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Subcomponents ────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('p-2 rounded-sm bg-muted border border-border')}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
        <div>
          <p className="text-xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleScoreRow({ score }: { score: UserReputationTotals }) {
  const levelMeta = LEVEL_META[score.current_level] || LEVEL_META['Novato'];
  return (
    <div className="flex items-center gap-3 p-3 rounded-sm border bg-card">
      <span className="text-lg">{levelMeta.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{ROLE_LABEL[score.role_key] || score.role_key}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>{score.lifetime_tasks} tareas</span>
          <span>{Math.round(score.on_time_rate * 100)}% a tiempo</span>
          {score.current_streak_days > 0 && (
            <span className="text-orange-400">{score.current_streak_days}d racha</span>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-primary">{score.lifetime_points.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">S: {score.season_points}</p>
      </div>
    </div>
  );
}

function EventsList({ events, loading, showUserName }: { events: any[]; loading: boolean; showUserName?: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Sin actividad reciente</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
      {events.map((ev: any, i: number) => {
        const label = ev.event_subtype
          ? EVENT_SUBTYPE_LABELS[ev.event_subtype] || ev.event_subtype
          : EVENT_TYPE_LABELS[ev.event_type] || ev.event_type;
        const points = ev.final_points ?? ev.base_points ?? 0;
        const isPositive = points >= 0;

        return (
          <div key={ev.id || i} className="flex items-center gap-3 p-3 rounded-sm border hover:bg-muted/50 transition-colors">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
              isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500',
            )}>
              {isPositive ? '+' : '−'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{ROLE_LABEL[ev.role_key] || ev.role_key}</span>
                {ev.event_date && (
                  <span>{format(new Date(ev.event_date), 'd MMM HH:mm', { locale: es })}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className={cn('font-bold', isPositive ? 'text-green-500' : 'text-red-500')}>
                {isPositive ? '+' : ''}{points}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
