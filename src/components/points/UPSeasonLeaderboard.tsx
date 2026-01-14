import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Trophy, Crown, Medal, Award, Camera, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SeasonSnapshot {
  id: string;
  user_id: string;
  final_points: number;
  final_level: string;
  final_rank: number;
  total_events: number;
  achievements_unlocked: number;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Season {
  id: string;
  name: string;
  mode: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
}

interface UPSeasonLeaderboardProps {
  organizationId: string;
  seasons: Season[];
}

const LEVEL_COLORS = {
  diamond: 'text-cyan-400',
  gold: 'text-yellow-500',
  silver: 'text-slate-400',
  bronze: 'text-amber-700'
};

const RANK_ICONS = [
  { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-500/20' },
  { icon: Medal, color: 'text-slate-400', bg: 'bg-slate-400/20' },
  { icon: Award, color: 'text-amber-700', bg: 'bg-amber-700/20' }
];

export function UPSeasonLeaderboard({ organizationId, seasons }: UPSeasonLeaderboardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<SeasonSnapshot[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [takingSnapshot, setTakingSnapshot] = useState(false);

  const activeSeason = seasons.find(s => s.is_active);
  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

  useEffect(() => {
    // Default to active season or first season
    if (seasons.length > 0 && !selectedSeasonId) {
      setSelectedSeasonId(activeSeason?.id || seasons[0].id);
    }
  }, [seasons, activeSeason]);

  useEffect(() => {
    if (selectedSeasonId) {
      fetchSnapshots();
    }
  }, [selectedSeasonId]);

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('up_season_snapshots')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('season_id', selectedSeasonId)
        .order('final_rank', { ascending: true });

      if (error) throw error;
      setSnapshots(data || []);
    } catch (error) {
      console.error('Error fetching snapshots:', error);
    } finally {
      setLoading(false);
    }
  };

  const takeSnapshot = async () => {
    if (!activeSeason) {
      toast({ title: 'No hay temporada activa', variant: 'destructive' });
      return;
    }

    setTakingSnapshot(true);
    try {
      // Get current user totals from both tables
      const [creatorsResult, editorsResult] = await Promise.all([
        supabase
          .from('up_creadores_totals')
          .select('user_id, total_points, current_level')
          .eq('organization_id', organizationId),
        supabase
          .from('up_editores_totals')
          .select('user_id, total_points, current_level')
          .eq('organization_id', organizationId)
      ]);

      // Combine points
      const userPoints: Record<string, { points: number; level: string }> = {};
      
      creatorsResult.data?.forEach(c => {
        userPoints[c.user_id] = { 
          points: c.total_points || 0, 
          level: c.current_level || 'bronze' 
        };
      });
      
      editorsResult.data?.forEach(e => {
        if (userPoints[e.user_id]) {
          userPoints[e.user_id].points += e.total_points || 0;
        } else {
          userPoints[e.user_id] = { 
            points: e.total_points || 0, 
            level: e.current_level || 'bronze' 
          };
        }
      });

      // Sort and rank
      const sorted = Object.entries(userPoints)
        .sort(([, a], [, b]) => b.points - a.points);

      // Insert snapshots
      const snapshotsToInsert = sorted.map(([userId, data], index) => ({
        season_id: activeSeason.id,
        user_id: userId,
        final_points: data.points,
        final_level: data.level,
        final_rank: index + 1,
        total_events: 0,
        achievements_unlocked: 0
      }));

      if (snapshotsToInsert.length > 0) {
        const { error } = await supabase
          .from('up_season_snapshots')
          .upsert(snapshotsToInsert, { onConflict: 'season_id,user_id' });

        if (error) throw error;
      }

      toast({ title: 'Snapshot tomado', description: `${snapshotsToInsert.length} usuarios registrados` });
      fetchSnapshots();
    } catch (error) {
      console.error('Error taking snapshot:', error);
      toast({ title: 'Error al tomar snapshot', variant: 'destructive' });
    } finally {
      setTakingSnapshot(false);
    }
  };

  if (loading && snapshots.length === 0) {
    return (
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Ranking por Temporada
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleccionar temporada" />
              </SelectTrigger>
              <SelectContent>
                {seasons.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.is_active && '(Activa)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeSeason && selectedSeasonId === activeSeason.id && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={takeSnapshot}
                disabled={takingSnapshot}
              >
                {takingSnapshot ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={fetchSnapshots}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {selectedSeason && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{format(new Date(selectedSeason.starts_at), 'd MMM yyyy', { locale: es })}</span>
            {selectedSeason.ends_at && (
              <>
                <span>→</span>
                <span>{format(new Date(selectedSeason.ends_at), 'd MMM yyyy', { locale: es })}</span>
              </>
            )}
            <Badge variant={selectedSeason.is_active ? 'default' : 'secondary'}>
              {selectedSeason.is_active ? 'En curso' : 'Finalizada'}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {snapshots.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {snapshots.map((snapshot, index) => {
                const rankStyle = RANK_ICONS[index];
                const RankIcon = rankStyle?.icon;

                return (
                  <div 
                    key={snapshot.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
                      index < 3 ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      rankStyle?.bg || "bg-muted"
                    )}>
                      {RankIcon ? (
                        <RankIcon className={cn("w-4 h-4", rankStyle?.color)} />
                      ) : (
                        <span className="text-muted-foreground">{snapshot.final_rank}</span>
                      )}
                    </div>
                    
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={(snapshot as any).profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {((snapshot as any).profiles?.full_name || 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {(snapshot as any).profiles?.full_name || 'Usuario'}
                      </p>
                      <p className={cn(
                        "text-xs capitalize",
                        LEVEL_COLORS[snapshot.final_level as keyof typeof LEVEL_COLORS] || 'text-muted-foreground'
                      )}>
                        {snapshot.final_level}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-bold text-primary">{snapshot.final_points} UP</p>
                      <p className="text-xs text-muted-foreground">
                        {snapshot.total_events} eventos
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Sin datos para esta temporada</p>
            <p className="text-sm">
              {selectedSeasonId === activeSeason?.id 
                ? 'Toma un snapshot para registrar el ranking actual'
                : 'No se registraron snapshots para esta temporada'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
