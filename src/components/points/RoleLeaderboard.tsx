import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Zap, Crown, Video, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreatorLeaderboard } from '@/hooks/useUPCreadores';
import { useEditorLeaderboard } from '@/hooks/useUPEditores';

interface RoleLeaderboardProps {
  role: 'creator' | 'editor';
  currentUserId?: string;
  maxItems?: number;
  showHeader?: boolean;
}

const LEVEL_ICONS = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎'
};

const LEVEL_COLORS = {
  bronze: 'text-amber-600',
  silver: 'text-slate-400',
  gold: 'text-yellow-500',
  diamond: 'text-cyan-400'
};

const RANK_ICONS = [
  { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-500/20' },
  { icon: Medal, color: 'text-slate-400', bg: 'bg-slate-400/20' },
  { icon: Medal, color: 'text-amber-600', bg: 'bg-amber-600/20' }
];

export function RoleLeaderboard({ role, currentUserId, maxItems = 10, showHeader = true }: RoleLeaderboardProps) {
  const { leaderboard: creatorLeaderboard, loading: loadingCreators } = useCreatorLeaderboard();
  const { leaderboard: editorLeaderboard, loading: loadingEditors } = useEditorLeaderboard();

  const leaderboard = role === 'creator' ? creatorLeaderboard : editorLeaderboard;
  const loading = role === 'creator' ? loadingCreators : loadingEditors;

  const RoleIcon = role === 'creator' ? Video : Scissors;
  const roleLabel = role === 'creator' ? 'Creadores' : 'Editores';

  if (loading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              Ranking {roleLabel}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const displayEntries = leaderboard.slice(0, maxItems);

  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Ranking {roleLabel}
            <RoleIcon className="w-4 h-4 text-muted-foreground ml-auto" />
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {displayEntries.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aún no hay rankings</p>
            <p className="text-xs">Completa contenido para aparecer aquí</p>
          </div>
        ) : (
          <ScrollArea className={maxItems > 5 ? "h-[400px] pr-2" : ""}>
            <div className="space-y-2">
              {displayEntries.map((entry, index) => {
                const isCurrentUser = entry.user_id === currentUserId;
                const rank = index + 1;
                const rankStyle = RANK_ICONS[rank - 1];
                const level = entry.current_level || 'bronze';
                
                return (
                  <div
                    key={entry.user_id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-colors",
                      isCurrentUser ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                    )}
                  >
                    {/* Rank */}
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold",
                      rank <= 3 ? rankStyle?.bg : "bg-muted"
                    )}>
                      {rank <= 3 && rankStyle ? (
                        <rankStyle.icon className={cn("w-4 h-4", rankStyle.color)} />
                      ) : (
                        <span className="text-muted-foreground">{rank}</span>
                      )}
                    </div>
                    
                    {/* Avatar */}
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={entry.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {(entry.profile?.full_name || 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Name & Level */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{entry.profile?.full_name || 'Usuario'}</p>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs py-0 px-1">Tú</Badge>
                        )}
                      </div>
                      <p className={cn("text-xs", LEVEL_COLORS[level])}>
                        {LEVEL_ICONS[level]} {level.charAt(0).toUpperCase() + level.slice(1)}
                      </p>
                    </div>
                    
                    {/* Points */}
                    <div className="flex items-center gap-1 text-sm font-bold">
                      <Zap className={cn("w-4 h-4", LEVEL_COLORS[level])} />
                      <span>{entry.total_points || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
