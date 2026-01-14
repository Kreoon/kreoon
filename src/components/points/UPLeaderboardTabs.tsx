import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Video, Scissors, Crown, Medal, Award, Star, TrendingUp, TrendingDown, CheckCircle, AlertCircle } from 'lucide-react';
import { useCreatorLeaderboard } from '@/hooks/useUPCreadores';
import { useEditorLeaderboard } from '@/hooks/useUPEditores';
import { cn } from '@/lib/utils';

const LEVEL_CONFIG = {
  bronze: { label: 'Bronce', color: 'text-amber-600', bg: 'bg-amber-600/20 border-amber-600/30', icon: Medal },
  silver: { label: 'Plata', color: 'text-slate-400', bg: 'bg-slate-400/20 border-slate-400/30', icon: Award },
  gold: { label: 'Oro', color: 'text-yellow-500', bg: 'bg-yellow-500/20 border-yellow-500/30', icon: Crown },
  diamond: { label: 'Diamante', color: 'text-cyan-400', bg: 'bg-cyan-400/20 border-cyan-400/30', icon: Star }
};

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
  return <span className="text-muted-foreground font-medium w-5 text-center">{rank}</span>;
}

interface LeaderboardEntryProps {
  rank: number;
  name: string;
  avatarUrl?: string | null;
  totalPoints: number;
  level: 'bronze' | 'silver' | 'gold' | 'diamond';
  stats: {
    onTime: number;
    late: number;
    cleanApprovals: number;
    issues: number;
  };
}

function LeaderboardEntry({ rank, name, avatarUrl, totalPoints, level, stats }: LeaderboardEntryProps) {
  const levelConfig = LEVEL_CONFIG[level];
  const LevelIcon = levelConfig.icon;

  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-lg border transition-all hover:bg-muted/50",
      rank <= 3 && "bg-gradient-to-r from-muted/30 to-transparent"
    )}>
      <div className="flex items-center justify-center w-8">
        {getRankIcon(rank)}
      </div>
      
      <Avatar className="h-10 w-10 border-2 border-border">
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback className="text-sm font-medium">
          {name?.slice(0, 2).toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{name || 'Usuario'}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className={cn("text-xs", levelConfig.bg, levelConfig.color)}>
            <LevelIcon className="h-3 w-3 mr-1" />
            {levelConfig.label}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-green-500" title="A tiempo">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>{stats.onTime}</span>
        </div>
        <div className="flex items-center gap-1 text-red-500" title="Tarde">
          <TrendingDown className="h-3.5 w-3.5" />
          <span>{stats.late}</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-500" title="Aprobación limpia">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>{stats.cleanApprovals}</span>
        </div>
        <div className="flex items-center gap-1 text-orange-500" title="Novedades">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{stats.issues}</span>
        </div>
      </div>

      <div className="text-right min-w-[80px]">
        <span className="text-lg font-bold">{totalPoints}</span>
        <span className="text-xs text-muted-foreground ml-1">UP</span>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

function EmptyLeaderboard({ type }: { type: 'creator' | 'editor' }) {
  const Icon = type === 'creator' ? Video : Scissors;
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-lg">Sin datos aún</h3>
      <p className="text-muted-foreground text-sm mt-1">
        Los puntos UP de {type === 'creator' ? 'creadores' : 'editores'} aparecerán aquí
      </p>
    </div>
  );
}

export function UPLeaderboardTabs() {
  const [activeTab, setActiveTab] = useState<'creators' | 'editors'>('creators');
  const { leaderboard: creatorLeaderboard, loading: loadingCreators } = useCreatorLeaderboard();
  const { leaderboard: editorLeaderboard, loading: loadingEditors } = useEditorLeaderboard();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Ranking UP
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'creators' | 'editors')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="creators" className="gap-2">
              <Video className="h-4 w-4" />
              Creadores
            </TabsTrigger>
            <TabsTrigger value="editors" className="gap-2">
              <Scissors className="h-4 w-4" />
              Editores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="creators" className="mt-0">
            {loadingCreators ? (
              <LeaderboardSkeleton />
            ) : creatorLeaderboard.length === 0 ? (
              <EmptyLeaderboard type="creator" />
            ) : (
              <div className="space-y-2">
                {creatorLeaderboard.map((entry, index) => (
                  <LeaderboardEntry
                    key={entry.user_id}
                    rank={index + 1}
                    name={entry.profile?.full_name || 'Usuario'}
                    avatarUrl={entry.profile?.avatar_url}
                    totalPoints={entry.total_points}
                    level={entry.current_level}
                    stats={{
                      onTime: entry.on_time_deliveries,
                      late: entry.late_deliveries,
                      cleanApprovals: entry.clean_approvals,
                      issues: entry.total_issues
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="editors" className="mt-0">
            {loadingEditors ? (
              <LeaderboardSkeleton />
            ) : editorLeaderboard.length === 0 ? (
              <EmptyLeaderboard type="editor" />
            ) : (
              <div className="space-y-2">
                {editorLeaderboard.map((entry, index) => (
                  <LeaderboardEntry
                    key={entry.user_id}
                    rank={index + 1}
                    name={entry.profile?.full_name || 'Usuario'}
                    avatarUrl={entry.profile?.avatar_url}
                    totalPoints={entry.total_points}
                    level={entry.current_level}
                    stats={{
                      onTime: entry.on_time_deliveries,
                      late: entry.late_deliveries,
                      cleanApprovals: entry.clean_approvals,
                      issues: entry.total_issues
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
