import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Trophy, Crown, Video, Scissors, Calendar, Users, Medal
} from 'lucide-react';
import { useUPSeasons, SeasonSnapshot, UPSeason } from '@/hooks/useUPSeasons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const LEVEL_ICONS: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎'
};

interface SeasonResultCardProps {
  season: UPSeason;
  creatorWinner?: SeasonSnapshot;
  editorWinner?: SeasonSnapshot;
  totalParticipants: number;
  onSelect: () => void;
  isSelected: boolean;
}

function SeasonResultCard({ season, creatorWinner, editorWinner, totalParticipants, onSelect, isSelected }: SeasonResultCardProps) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:border-primary/50",
        isSelected && "border-primary bg-primary/5"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="font-medium">{season.name}</span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(season.starts_at), 'PPP', { locale: es })} - 
              {season.ends_at && format(new Date(season.ends_at), 'PPP', { locale: es })}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            {totalParticipants}
          </Badge>
        </div>

        {(creatorWinner || editorWinner) && (
          <div className="mt-3 pt-3 border-t space-y-2">
            {creatorWinner && (
              <div className="flex items-center gap-2 text-sm">
                <Crown className="w-4 h-4 text-yellow-500" />
                <Video className="w-3 h-3 text-muted-foreground" />
                <Avatar className="h-5 w-5">
                  <AvatarImage src={creatorWinner.profile?.avatar_url || ''} />
                  <AvatarFallback className="text-[10px]">
                    {creatorWinner.profile?.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{creatorWinner.profile?.full_name || 'Creador'}</span>
                <span className="text-muted-foreground ml-auto">{creatorWinner.final_points} UP</span>
              </div>
            )}
            {editorWinner && (
              <div className="flex items-center gap-2 text-sm">
                <Crown className="w-4 h-4 text-yellow-500" />
                <Scissors className="w-3 h-3 text-muted-foreground" />
                <Avatar className="h-5 w-5">
                  <AvatarImage src={editorWinner.profile?.avatar_url || ''} />
                  <AvatarFallback className="text-[10px]">
                    {editorWinner.profile?.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{editorWinner.profile?.full_name || 'Editor'}</span>
                <span className="text-muted-foreground ml-auto">{editorWinner.final_points} UP</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SeasonDetailViewProps {
  season: UPSeason;
  snapshots: SeasonSnapshot[];
}

function SeasonDetailView({ season, snapshots }: SeasonDetailViewProps) {
  const creatorSnapshots = snapshots.filter(s => s.user_type === 'creator');
  const editorSnapshots = snapshots.filter(s => s.user_type === 'editor');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          {season.name} - Resultados Finales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="creators">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="creators" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Creadores ({creatorSnapshots.length})
            </TabsTrigger>
            <TabsTrigger value="editors" className="flex items-center gap-2">
              <Scissors className="w-4 h-4" />
              Editores ({editorSnapshots.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="creators">
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {creatorSnapshots.map((snapshot, index) => (
                  <div 
                    key={snapshot.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border",
                      index === 0 && "bg-yellow-500/10 border-yellow-500/30",
                      index === 1 && "bg-slate-400/10 border-slate-400/30",
                      index === 2 && "bg-amber-700/10 border-amber-700/30"
                    )}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold">
                      {index < 3 ? (
                        <Medal className={cn(
                          "w-5 h-5",
                          index === 0 && "text-yellow-500",
                          index === 1 && "text-slate-400",
                          index === 2 && "text-amber-700"
                        )} />
                      ) : (
                        snapshot.final_rank
                      )}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={snapshot.profile?.avatar_url || ''} />
                      <AvatarFallback>
                        {snapshot.profile?.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{snapshot.profile?.full_name || 'Usuario'}</p>
                      <p className="text-xs text-muted-foreground">
                        {LEVEL_ICONS[snapshot.final_level]} {snapshot.final_level}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{snapshot.final_points} UP</p>
                    </div>
                  </div>
                ))}
                {creatorSnapshots.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay registros de creadores para esta temporada
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="editors">
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {editorSnapshots.map((snapshot, index) => (
                  <div 
                    key={snapshot.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border",
                      index === 0 && "bg-yellow-500/10 border-yellow-500/30",
                      index === 1 && "bg-slate-400/10 border-slate-400/30",
                      index === 2 && "bg-amber-700/10 border-amber-700/30"
                    )}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold">
                      {index < 3 ? (
                        <Medal className={cn(
                          "w-5 h-5",
                          index === 0 && "text-yellow-500",
                          index === 1 && "text-slate-400",
                          index === 2 && "text-amber-700"
                        )} />
                      ) : (
                        snapshot.final_rank
                      )}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={snapshot.profile?.avatar_url || ''} />
                      <AvatarFallback>
                        {snapshot.profile?.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{snapshot.profile?.full_name || 'Usuario'}</p>
                      <p className="text-xs text-muted-foreground">
                        {LEVEL_ICONS[snapshot.final_level]} {snapshot.final_level}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{snapshot.final_points} UP</p>
                    </div>
                  </div>
                ))}
                {editorSnapshots.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay registros de editores para esta temporada
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function UPSeasonHistory() {
  const { seasons, getSeasonSnapshots, getFinishedSeasonsWithResults } = useUPSeasons();
  const [finishedResults, setFinishedResults] = useState<{
    season: UPSeason;
    creatorWinner?: SeasonSnapshot;
    editorWinner?: SeasonSnapshot;
    totalParticipants: number;
  }[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<UPSeason | null>(null);
  const [selectedSnapshots, setSelectedSnapshots] = useState<SeasonSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const results = await getFinishedSeasonsWithResults();
      setFinishedResults(results);
      setLoading(false);
    };
    load();
  }, [seasons]);

  const handleSelectSeason = async (season: UPSeason) => {
    setSelectedSeason(season);
    const snapshots = await getSeasonSnapshots(season.id);
    setSelectedSnapshots(snapshots);
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Cargando historial...
      </div>
    );
  }

  if (finishedResults.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-medium mb-1">Sin temporadas finalizadas</h3>
          <p className="text-sm text-muted-foreground">
            El historial aparecerá aquí cuando finalice la primera temporada
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-3">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
          Temporadas Finalizadas
        </h3>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-4">
            {finishedResults.map(result => (
              <SeasonResultCard
                key={result.season.id}
                season={result.season}
                creatorWinner={result.creatorWinner}
                editorWinner={result.editorWinner}
                totalParticipants={result.totalParticipants}
                onSelect={() => handleSelectSeason(result.season)}
                isSelected={selectedSeason?.id === result.season.id}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      <div>
        {selectedSeason ? (
          <SeasonDetailView season={selectedSeason} snapshots={selectedSnapshots} />
        ) : (
          <Card className="h-full flex items-center justify-center border-dashed">
            <CardContent className="text-center py-12">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                Selecciona una temporada para ver los resultados detallados
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
