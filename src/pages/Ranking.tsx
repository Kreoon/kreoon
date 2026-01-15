import { useAuth } from '@/hooks/useAuth';
import { useCreatorLeaderboard } from '@/hooks/useUPCreadores';
import { useEditorLeaderboard } from '@/hooks/useUPEditores';
import { useUPSettings } from '@/hooks/useUPSettings';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Zap, Crown, TrendingUp, Flame, Target, Users, History, Sword, Shield, Castle, Swords, Award, Video, Scissors, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { UPManualAdjustment } from '@/components/points/UPManualAdjustment';
import { UPControlCenter } from '@/components/points/UPControlCenter';
import { UnifiedBadgesShowcase } from '@/components/points/UnifiedBadgesShowcase';
import { UPLeaderboardTabs } from '@/components/points/UPLeaderboardTabs';
import { UPUserStats } from '@/components/points/UPUserStats';
import { UPHistoryTable } from '@/components/points/UPHistoryTable';
import { UPBadgeHolders } from '@/components/points/UPBadgeHolders';
import { UPSeasonHistory } from '@/components/points/UPSeasonHistory';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Prestige Level Icons & Labels
const LEVEL_ICONS = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎'
};

const LEVEL_LABELS = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  diamond: 'Diamante'
};

const LEVEL_COLORS = {
  bronze: 'text-amber-700',
  silver: 'text-slate-400',
  gold: 'text-yellow-600',
  diamond: 'text-cyan-400'
};

const LEVEL_BG_COLORS = {
  bronze: 'bg-amber-700/20 border-amber-700/40',
  silver: 'bg-slate-400/20 border-slate-400/40',
  gold: 'bg-yellow-600/20 border-yellow-600/40',
  diamond: 'bg-cyan-400/20 border-cyan-400/40'
};

const RANK_STYLES = [
  { icon: Crown, color: 'text-yellow-600', bg: 'bg-gradient-to-br from-yellow-600/30 to-yellow-700/10 border-yellow-600/50' },
  { icon: Medal, color: 'text-slate-400', bg: 'bg-gradient-to-br from-slate-400/30 to-slate-500/10 border-slate-400/50' },
  { icon: Award, color: 'text-amber-700', bg: 'bg-gradient-to-br from-amber-700/30 to-amber-800/10 border-amber-700/50' }
];

interface CombinedLeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_points: number;
  current_level: 'bronze' | 'silver' | 'gold' | 'diamond';
  rank: number;
}

export default function RankingPage() {
  const { user, isAdmin } = useAuth();
  const { leaderboard: creatorLeaderboard, loading: loadingCreators } = useCreatorLeaderboard();
  const { leaderboard: editorLeaderboard, loading: loadingEditors } = useEditorLeaderboard();
  const { getLevelThresholds, isSystemEnabled, loading: loadingSettings } = useUPSettings();
  const { currentOrgId } = useOrgOwner();

  const thresholds = getLevelThresholds();
  const loading = loadingCreators || loadingEditors || loadingSettings;

  // Combine creator and editor leaderboards into a unified ranking
  const leaderboard = useMemo<CombinedLeaderboardEntry[]>(() => {
    const userPointsMap = new Map<string, { points: number; level: 'bronze' | 'silver' | 'gold' | 'diamond'; name: string; avatar: string | null }>();

    // Add creator points
    creatorLeaderboard.forEach(entry => {
      const existing = userPointsMap.get(entry.user_id);
      if (existing) {
        existing.points += entry.total_points;
      } else {
        userPointsMap.set(entry.user_id, {
          points: entry.total_points,
          level: entry.current_level,
          name: entry.profile?.full_name || 'Usuario',
          avatar: entry.profile?.avatar_url || null
        });
      }
    });

    // Add editor points
    editorLeaderboard.forEach(entry => {
      const existing = userPointsMap.get(entry.user_id);
      if (existing) {
        existing.points += entry.total_points;
        // Use higher level
        const levelOrder = { bronze: 0, silver: 1, gold: 2, diamond: 3 };
        if (levelOrder[entry.current_level] > levelOrder[existing.level]) {
          existing.level = entry.current_level;
        }
      } else {
        userPointsMap.set(entry.user_id, {
          points: entry.total_points,
          level: entry.current_level,
          name: entry.profile?.full_name || 'Usuario',
          avatar: entry.profile?.avatar_url || null
        });
      }
    });

    // Calculate level based on combined points
    const calculateLevel = (points: number): 'bronze' | 'silver' | 'gold' | 'diamond' => {
      if (points >= thresholds.diamond) return 'diamond';
      if (points >= thresholds.gold) return 'gold';
      if (points >= thresholds.silver) return 'silver';
      return 'bronze';
    };

    // Convert to array, recalculate levels, sort and rank
    const entries = Array.from(userPointsMap.entries())
      .map(([user_id, data]) => ({
        user_id,
        full_name: data.name,
        avatar_url: data.avatar,
        total_points: data.points,
        current_level: calculateLevel(data.points)
      }))
      .sort((a, b) => b.total_points - a.total_points)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

    return entries;
  }, [creatorLeaderboard, editorLeaderboard, thresholds]);

  // Estadísticas globales
  const totalPoints = leaderboard.reduce((sum, entry) => sum + entry.total_points, 0);
  const diamondCount = leaderboard.filter(e => e.current_level === 'diamond').length;
  const goldCount = leaderboard.filter(e => e.current_level === 'gold').length;
  const silverCount = leaderboard.filter(e => e.current_level === 'silver').length;
  const currentUserRank = leaderboard.find(e => e.user_id === user?.id)?.rank;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={Castle}
        title="KREOON UP"
        subtitle="Sistema de puntos, logros y ranking de rendimiento"
        badge={!isSystemEnabled() ? { text: "⚠️ Sistema Suspendido", variant: "destructive" as const } : undefined}
        action={currentUserRank ? (
          <Badge className="text-sm px-3 py-1 font-medieval level-gold" variant="outline">
            <Sword className="w-3 h-3 mr-1" />
            Rango #{currentUserRank}
          </Badge>
        ) : undefined}
      />

      {/* Tabs for Admin */}
      {isAdmin ? (
        <Tabs defaultValue="upv2" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid bg-secondary/50 border border-border">
            <TabsTrigger value="upv2" className="flex items-center gap-2 font-medieval data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">UP V2</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2 font-medieval data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="seasons" className="flex items-center gap-2 font-medieval data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Temporadas</span>
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2 font-medieval data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Swords className="w-4 h-4" />
              <span className="hidden sm:inline">Comandar</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 font-medieval data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Crónicas</span>
            </TabsTrigger>
            <TabsTrigger value="control" className="flex items-center gap-2 font-medieval data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Castle className="w-4 h-4" />
              <span className="hidden sm:inline">Control</span>
            </TabsTrigger>
          </TabsList>

          {/* New UP V2 Tab - Separate Creator/Editor Rankings */}
          <TabsContent value="upv2" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UPLeaderboardTabs />
              <Card className="border-2 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Sistema UP V2
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p><strong>Creadores:</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>+70 UP: Entrega Día 1-2</li>
                      <li>+50 UP: Entrega Día 3</li>
                      <li>-30 UP: Retraso Día 4-5</li>
                      <li>Día 6+: Reasignación automática</li>
                    </ul>
                    <p className="mt-3"><strong>Editores:</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>+70 UP: Entrega Día 1</li>
                      <li>+50 UP: Entrega Día 2</li>
                      <li>-30 UP: Retraso Día 3-4</li>
                      <li>Día 5+: Reasignación automática</li>
                    </ul>
                    <p className="mt-3"><strong>Correcciones (Novedad):</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>-10 UP: Por cada novedad</li>
                      <li>+10 UP: Recuperable si se corrige en 2 días</li>
                      <li>+10 UP: Bonus aprobación limpia</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ranking" className="space-y-6">
            <RankingContent 
              leaderboard={leaderboard}
              totalPoints={totalPoints}
              diamondCount={diamondCount}
              goldCount={goldCount}
              silverCount={silverCount}
              currentUserId={user?.id}
              thresholds={thresholds}
            />
          </TabsContent>

          <TabsContent value="seasons" className="space-y-6">
            <UPSeasonHistory />
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UPManualAdjustment />
              <Card className="border-2 border-border bg-gradient-parchment">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-medieval">
                    <Shield className="w-5 h-5 text-primary" />
                    Distribución de Rangos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(['diamond', 'gold', 'silver', 'bronze'] as const).map(level => {
                    const count = leaderboard.filter(e => e.current_level === level).length;
                    const percentage = leaderboard.length > 0 ? (count / leaderboard.length) * 100 : 0;
                    
                    return (
                      <div key={level} className="space-y-1">
                        <div className="flex items-center justify-between text-sm font-body">
                          <span className="flex items-center gap-2 font-medieval">
                            {LEVEL_ICONS[level]} {LEVEL_LABELS[level]}
                          </span>
                          <span className="font-medium">{count} caballeros</span>
                        </div>
                        <div className="h-3 rounded-sm bg-muted overflow-hidden border border-border">
                          <div 
                            className={cn(
                              "h-full transition-all",
                              level === 'diamond' && "bg-gradient-to-r from-cyan-500 to-cyan-400",
                              level === 'gold' && "bg-gradient-to-r from-yellow-600 to-yellow-500",
                              level === 'silver' && "bg-gradient-to-r from-slate-400 to-slate-300",
                              level === 'bronze' && "bg-gradient-to-r from-amber-700 to-amber-600"
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Requiere: {thresholds[level]}+ puntos de honor
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card className="border-2 border-border bg-gradient-parchment">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-medieval">
                  <History className="w-5 h-5 text-primary" />
                  Crónicas del Reino
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GlobalPointsHistory />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="control">
            {currentOrgId && <UPControlCenter organizationId={currentOrgId} />}
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="upv2" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid bg-secondary/50 border border-border">
            <TabsTrigger value="upv2" className="flex items-center gap-2 font-medieval data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Video className="w-4 h-4" />
              Mis Puntos
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2 font-medieval data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Trophy className="w-4 h-4" />
              Ranking
            </TabsTrigger>
            <TabsTrigger value="seasons" className="flex items-center gap-2 font-medieval data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="w-4 h-4" />
              Temporadas
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2 font-medieval data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Award className="w-4 h-4" />
              Logros
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upv2" className="space-y-6">
            {user && (
              <>
                <UPUserStats userId={user.id} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <UPLeaderboardTabs />
                  <UPHistoryTable userId={user.id} />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="ranking" className="space-y-6">
            <RankingContent 
              leaderboard={leaderboard}
              totalPoints={totalPoints}
              diamondCount={diamondCount}
              goldCount={goldCount}
              silverCount={silverCount}
              currentUserId={user?.id}
              thresholds={thresholds}
            />
          </TabsContent>

          <TabsContent value="seasons" className="space-y-6">
            <UPSeasonHistory />
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            {user && <UnifiedBadgesShowcase userId={user.id} variant="full" />}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Componente separado para el contenido del ranking
interface RankingContentProps {
  leaderboard: CombinedLeaderboardEntry[];
  totalPoints: number;
  diamondCount: number;
  goldCount: number;
  silverCount: number;
  currentUserId?: string;
  thresholds: { bronze: number; silver: number; gold: number; diamond: number };
}

function RankingContent({ 
  leaderboard, 
  totalPoints, 
  diamondCount, 
  goldCount, 
  silverCount,
  currentUserId,
  thresholds
}: RankingContentProps) {
  return (
    <>
      {/* Stats Overview - Medieval Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Flame className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Puntos UP</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-cyan-400/30 bg-cyan-400/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-400/10 border border-cyan-400/20">
              <Castle className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-cyan-400">{diamondCount}</p>
              <p className="text-xs text-muted-foreground">Diamante ({thresholds.diamond}+)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <Crown className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-500">{goldCount}</p>
              <p className="text-xs text-muted-foreground">Oro ({thresholds.gold}+)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-success/40 bg-gradient-to-br from-success/15 to-success/5 emboss">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/25 border border-success/30">
              <Swords className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success font-medieval">{leaderboard.length}</p>
              <p className="text-xs text-muted-foreground font-body">Miembros de la Orden</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Combined Leaderboard */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-medieval">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Ranking General (Creadores + Editores)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sword className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium font-medieval">Sin caballeros en la orden</p>
              <p className="text-sm font-body">Completa misiones para ser nombrado caballero</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry) => {
                const isCurrentUser = entry.user_id === currentUserId;
                const rankStyle = RANK_STYLES[entry.rank - 1];
                
                return (
                  <div
                    key={entry.user_id}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-lg transition-colors border",
                      isCurrentUser ? "bg-primary/15 border-primary/40" : "hover:bg-muted/50 border-transparent",
                      entry.rank <= 3 && "border-2"
                    )}
                  >
                    {/* Rank */}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 font-medieval",
                      entry.rank <= 3 ? rankStyle?.bg : "bg-muted border border-border"
                    )}>
                      {entry.rank <= 3 && rankStyle ? (
                        <rankStyle.icon className={cn("w-5 h-5", rankStyle.color)} />
                      ) : (
                        <span className="text-muted-foreground">{entry.rank}</span>
                      )}
                    </div>
                    
                    {/* Avatar */}
                    <Avatar className="h-10 w-10 flex-shrink-0 border-2 border-border">
                      <AvatarImage src={entry.avatar_url || undefined} />
                      <AvatarFallback className="font-medieval">
                        {entry.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Name & Level */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate font-medieval">{entry.full_name}</p>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs font-medieval">Tú</Badge>
                        )}
                      </div>
                      <div className={cn("flex items-center gap-1 text-sm font-body", LEVEL_COLORS[entry.current_level])}>
                        <span>{LEVEL_ICONS[entry.current_level]}</span>
                        <span>{LEVEL_LABELS[entry.current_level]}</span>
                      </div>
                    </div>
                    
                    {/* Points */}
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg border font-medieval",
                      LEVEL_BG_COLORS[entry.current_level]
                    )}>
                      <Flame className={cn("w-4 h-4", LEVEL_COLORS[entry.current_level])} />
                      <span className={cn("font-bold", LEVEL_COLORS[entry.current_level])}>
                        {entry.total_points}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// Componente para historial global - Medieval Chronicle (V2 only)
function GlobalPointsHistory() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentOrgId } = useOrgOwner();

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrgId]);

  const fetchTransactions = async () => {
    try {
      if (!currentOrgId) {
        setTransactions([]);
        return;
      }

      // Fetch from V2 sources only: up_creadores and up_editores
      const [creatorsRes, editorsRes] = await Promise.all([
        supabase
          .from('up_creadores')
          .select('id, user_id, event_type, points, description, created_at')
          .eq('organization_id', currentOrgId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('up_editores')
          .select('id, user_id, event_type, points, description, created_at')
          .eq('organization_id', currentOrgId)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      // Combine and normalize all transactions
      const creatorTx = (creatorsRes.data || []).map(tx => ({
        ...tx,
        transaction_type: tx.event_type,
        source: 'creator' as const
      }));

      const editorTx = (editorsRes.data || []).map(tx => ({
        ...tx,
        transaction_type: tx.event_type,
        source: 'editor' as const
      }));

      // Merge all transactions
      const allTransactions = [...creatorTx, ...editorTx];

      // Sort by date descending
      allTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Get unique user IDs
      const userIds = [...new Set(allTransactions.map(tx => tx.user_id))];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

      // Attach profiles and take top 100
      const enrichedTransactions = allTransactions.slice(0, 100).map(tx => ({
        ...tx,
        profiles: profilesMap.get(tx.user_id)
      }));

      setTransactions(enrichedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const TRANSACTION_LABELS: Record<string, string> = {
    // V2 events
    delivery_on_time: 'Entrega a Tiempo',
    delivery_day2: 'Entrega Día 2',
    delivery_day3: 'Entrega Día 3',
    late_day3: 'Retraso Día 3',
    late_day4: 'Retraso Día 4',
    late_day5: 'Retraso Día 5',
    on_time_delivery: 'Entrega a Tiempo',
    issue_penalty: 'Novedad Reportada',
    issue_recovery: 'Novedad Resuelta',
    clean_approval_bonus: 'Aprobación Limpia',
    reassignment_penalty: 'Reasignación',
    manual_adjustment: 'Ajuste Manual'
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'creator':
        return <Badge variant="outline" className="text-[10px] px-1 py-0 bg-info/10 text-info border-info/30">Creador</Badge>;
      case 'editor':
        return <Badge variant="outline" className="text-[10px] px-1 py-0 bg-warning/10 text-warning border-warning/30">Editor</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Sin actividad reciente</p>
        <p className="text-sm">El historial de actividad aparecerá aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
      {transactions.map(tx => (
        <div
          key={tx.id}
          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
        >
          <Avatar className="h-10 w-10 border-2 border-border">
            <AvatarImage src={tx.profiles?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {tx.profiles?.full_name?.slice(0, 2).toUpperCase() || '??'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{tx.profiles?.full_name || 'Usuario'}</p>
              {getSourceBadge(tx.source)}
            </div>
            <p className="text-xs text-muted-foreground">
              {TRANSACTION_LABELS[tx.transaction_type] || tx.transaction_type}
              {tx.description && ` — ${tx.description}`}
            </p>
          </div>
          <div className="text-right">
            <p className={cn(
              "font-bold",
              tx.points > 0 ? "text-success" : "text-destructive"
            )}>
              {tx.points > 0 ? '+' : ''}{tx.points} UP
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(tx.created_at), "d MMM HH:mm", { locale: es })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
