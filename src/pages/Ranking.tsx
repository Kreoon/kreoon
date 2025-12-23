import { useAuth } from '@/hooks/useAuth';
import { useLeaderboard } from '@/hooks/useUserPoints';
import { useUPSettings } from '@/hooks/useUPSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Zap, Crown, TrendingUp, Flame, Target, Settings, Users, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UPSettingsPanel } from '@/components/points/UPSettingsPanel';
import { UPManualAdjustment } from '@/components/points/UPManualAdjustment';
import { Leaderboard } from '@/components/points/Leaderboard';
import { PointsHistory } from '@/components/points/PointsHistory';

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
  bronze: 'text-amber-600',
  silver: 'text-slate-400',
  gold: 'text-yellow-500',
  diamond: 'text-cyan-400'
};

const LEVEL_BG_COLORS = {
  bronze: 'bg-amber-600/20 border-amber-600/30',
  silver: 'bg-slate-400/20 border-slate-400/30',
  gold: 'bg-yellow-500/20 border-yellow-500/30',
  diamond: 'bg-cyan-400/20 border-cyan-400/30'
};

const RANK_STYLES = [
  { icon: Crown, color: 'text-yellow-500', bg: 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/10 border-yellow-500/50' },
  { icon: Medal, color: 'text-slate-300', bg: 'bg-gradient-to-br from-slate-400/30 to-slate-500/10 border-slate-400/50' },
  { icon: Medal, color: 'text-amber-600', bg: 'bg-gradient-to-br from-amber-600/30 to-amber-700/10 border-amber-600/50' }
];

export default function RankingPage() {
  const { user, isAdmin } = useAuth();
  const { leaderboard, loading } = useLeaderboard();
  const { getLevelThresholds, isSystemEnabled } = useUPSettings();

  const thresholds = getLevelThresholds();

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Sistema UP (UGC Points)</h1>
            <p className="text-sm text-muted-foreground">Gamificación y ranking de creadores y editores</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isSystemEnabled() && (
            <Badge variant="destructive">Sistema Deshabilitado</Badge>
          )}
          {currentUserRank && (
            <Badge className="text-sm px-3 py-1" variant="outline">
              Tu posición: #{currentUserRank}
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs for Admin */}
      {isAdmin ? (
        <Tabs defaultValue="ranking" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="ranking" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Ranking</span>
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Gestionar</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Historial</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Configuración</span>
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="manage" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UPManualAdjustment />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Distribución por Niveles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(['diamond', 'gold', 'silver', 'bronze'] as const).map(level => {
                    const count = leaderboard.filter(e => e.current_level === level).length;
                    const percentage = leaderboard.length > 0 ? (count / leaderboard.length) * 100 : 0;
                    
                    return (
                      <div key={level} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            {LEVEL_ICONS[level]} {LEVEL_LABELS[level]}
                          </span>
                          <span className="font-medium">{count} usuarios</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all",
                              level === 'diamond' && "bg-cyan-400",
                              level === 'gold' && "bg-yellow-500",
                              level === 'silver' && "bg-slate-400",
                              level === 'bronze' && "bg-amber-600"
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Umbral: {thresholds[level]}+ UP
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Historial Global de Transacciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GlobalPointsHistory />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <UPSettingsPanel />
          </TabsContent>
        </Tabs>
      ) : (
        <RankingContent 
          leaderboard={leaderboard}
          totalPoints={totalPoints}
          diamondCount={diamondCount}
          goldCount={goldCount}
          silverCount={silverCount}
          currentUserId={user?.id}
          thresholds={thresholds}
        />
      )}
    </div>
  );
}

// Componente separado para el contenido del ranking
interface RankingContentProps {
  leaderboard: any[];
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
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total UP</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-400/30 bg-gradient-to-br from-cyan-400/10 to-cyan-400/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-400/20">
              <span className="text-lg">💎</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-cyan-400">{diamondCount}</p>
              <p className="text-xs text-muted-foreground">Diamante ({thresholds.diamond}+ UP)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <span className="text-lg">🥇</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-500">{goldCount}</p>
              <p className="text-xs text-muted-foreground">Oro ({thresholds.gold}+ UP)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-success/30 bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/20">
              <Target className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{leaderboard.length}</p>
              <p className="text-xs text-muted-foreground">Participantes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {/* 2nd Place */}
          <div className="flex flex-col items-center pt-8">
            <Card className={cn("w-full border-2", RANK_STYLES[1].bg)}>
              <CardContent className="p-4 flex flex-col items-center">
                <div className="relative -mt-10 mb-2">
                  <Avatar className="h-16 w-16 border-4 border-slate-400">
                    <AvatarImage src={leaderboard[1].avatar_url || undefined} />
                    <AvatarFallback className="text-lg">
                      {leaderboard[1].full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-400">
                    <Medal className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="font-bold text-center truncate w-full">{leaderboard[1].full_name}</p>
                <p className={cn("text-sm", LEVEL_COLORS[leaderboard[1].current_level as keyof typeof LEVEL_COLORS])}>
                  {LEVEL_ICONS[leaderboard[1].current_level as keyof typeof LEVEL_ICONS]} {LEVEL_LABELS[leaderboard[1].current_level as keyof typeof LEVEL_LABELS]}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Zap className="w-4 h-4 text-slate-400" />
                  <span className="font-bold">{leaderboard[1].total_points} UP</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center">
            <Card className={cn("w-full border-2", RANK_STYLES[0].bg)}>
              <CardContent className="p-4 flex flex-col items-center">
                <div className="relative -mt-10 mb-2">
                  <Avatar className="h-20 w-20 border-4 border-yellow-500">
                    <AvatarImage src={leaderboard[0].avatar_url || undefined} />
                    <AvatarFallback className="text-xl">
                      {leaderboard[0].full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-yellow-500">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="font-bold text-lg text-center truncate w-full">{leaderboard[0].full_name}</p>
                <p className={cn("text-sm", LEVEL_COLORS[leaderboard[0].current_level as keyof typeof LEVEL_COLORS])}>
                  {LEVEL_ICONS[leaderboard[0].current_level as keyof typeof LEVEL_ICONS]} {LEVEL_LABELS[leaderboard[0].current_level as keyof typeof LEVEL_LABELS]}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <span className="font-bold text-lg">{leaderboard[0].total_points} UP</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center pt-12">
            <Card className={cn("w-full border-2", RANK_STYLES[2].bg)}>
              <CardContent className="p-4 flex flex-col items-center">
                <div className="relative -mt-10 mb-2">
                  <Avatar className="h-14 w-14 border-4 border-amber-600">
                    <AvatarImage src={leaderboard[2].avatar_url || undefined} />
                    <AvatarFallback>
                      {leaderboard[2].full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-amber-600">
                    <Medal className="w-3 h-3 text-white" />
                  </div>
                </div>
                <p className="font-bold text-center truncate w-full text-sm">{leaderboard[2].full_name}</p>
                <p className={cn("text-xs", LEVEL_COLORS[leaderboard[2].current_level as keyof typeof LEVEL_COLORS])}>
                  {LEVEL_ICONS[leaderboard[2].current_level as keyof typeof LEVEL_ICONS]} {LEVEL_LABELS[leaderboard[2].current_level as keyof typeof LEVEL_LABELS]}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Zap className="w-3 h-3 text-amber-600" />
                  <span className="font-bold text-sm">{leaderboard[2].total_points} UP</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Clasificación Completa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aún no hay rankings</p>
              <p className="text-sm">Completa contenido para aparecer aquí</p>
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
                      "flex items-center gap-4 p-3 rounded-lg transition-colors",
                      isCurrentUser ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50",
                      entry.rank <= 3 && "border"
                    )}
                  >
                    {/* Rank */}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                      entry.rank <= 3 ? rankStyle?.bg : "bg-muted"
                    )}>
                      {entry.rank <= 3 && rankStyle ? (
                        <rankStyle.icon className={cn("w-5 h-5", rankStyle.color)} />
                      ) : (
                        <span className="text-muted-foreground">{entry.rank}</span>
                      )}
                    </div>
                    
                    {/* Avatar */}
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={entry.avatar_url || undefined} />
                      <AvatarFallback>
                        {entry.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Name & Level */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{entry.full_name}</p>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">Tú</Badge>
                        )}
                      </div>
                      <div className={cn("flex items-center gap-1 text-sm", LEVEL_COLORS[entry.current_level as keyof typeof LEVEL_COLORS])}>
                        <span>{LEVEL_ICONS[entry.current_level as keyof typeof LEVEL_ICONS]}</span>
                        <span>{LEVEL_LABELS[entry.current_level as keyof typeof LEVEL_LABELS]}</span>
                      </div>
                    </div>
                    
                    {/* Points */}
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full border",
                      LEVEL_BG_COLORS[entry.current_level as keyof typeof LEVEL_BG_COLORS]
                    )}>
                      <Zap className={cn("w-4 h-4", LEVEL_COLORS[entry.current_level as keyof typeof LEVEL_COLORS])} />
                      <span className={cn("font-bold", LEVEL_COLORS[entry.current_level as keyof typeof LEVEL_COLORS])}>
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

// Componente para historial global
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function GlobalPointsHistory() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('point_transactions')
        .select(`
          *,
          profiles:user_id (full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const TRANSACTION_LABELS: Record<string, string> = {
    base_completion: 'Completado',
    early_delivery: 'Entrega anticipada',
    late_delivery: 'Entrega tardía',
    correction_needed: 'Corrección',
    perfect_streak: 'Racha perfecta',
    five_star_rating: 'Aprobación',
    viral_hook: 'Hook viral',
    manual_adjustment: 'Ajuste manual'
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
        <p className="text-lg font-medium">Sin transacciones</p>
        <p className="text-sm">Las transacciones de puntos aparecerán aquí</p>
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
          <Avatar className="h-10 w-10">
            <AvatarImage src={tx.profiles?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {tx.profiles?.full_name?.slice(0, 2).toUpperCase() || '??'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{tx.profiles?.full_name || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground">
              {TRANSACTION_LABELS[tx.transaction_type] || tx.transaction_type}
              {tx.description && ` - ${tx.description}`}
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
