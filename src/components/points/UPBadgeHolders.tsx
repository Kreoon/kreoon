import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface BadgeHolder {
  id: string;
  user_id: string;
  unlocked_at: string;
  full_name: string;
  avatar_url: string | null;
}

interface Achievement {
  id: string;
  name: string;
  icon: string;
  rarity: string;
  description: string;
  holders: BadgeHolder[];
}

const RARITY_COLORS = {
  common: 'border-muted-foreground/30 bg-muted/20',
  uncommon: 'border-green-500/30 bg-green-500/10',
  rare: 'border-cyan-500/30 bg-cyan-500/10',
  legendary: 'border-amber-500/30 bg-amber-500/10'
};

const RARITY_LABELS = {
  common: 'Común',
  uncommon: 'Poco común',
  rare: 'Raro',
  legendary: 'Legendario'
};

export function UPBadgeHolders() {
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedAchievement, setSelectedAchievement] = useState<string>('all');
  const [recentUnlocks, setRecentUnlocks] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all achievements
      const { data: achievementsData } = await supabase
        .from('achievements')
        .select('*')
        .order('rarity', { ascending: false });

      // Fetch all user achievements with user info
      const { data: userAchievementsData } = await supabase
        .from('user_achievements')
        .select(`
          id,
          user_id,
          achievement_id,
          unlocked_at,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .order('unlocked_at', { ascending: false });

      if (achievementsData && userAchievementsData) {
        // Group holders by achievement
        const achievementsWithHolders = achievementsData.map(achievement => ({
          ...achievement,
          holders: userAchievementsData
            .filter(ua => ua.achievement_id === achievement.id)
            .map(ua => ({
              id: ua.id,
              user_id: ua.user_id,
              unlocked_at: ua.unlocked_at,
              full_name: (ua.profiles as any)?.full_name || 'Usuario',
              avatar_url: (ua.profiles as any)?.avatar_url
            }))
        }));

        setAchievements(achievementsWithHolders);

        // Get recent unlocks (last 20)
        setRecentUnlocks(
          userAchievementsData.slice(0, 20).map(ua => {
            const achievement = achievementsData.find(a => a.id === ua.achievement_id);
            return {
              ...ua,
              achievement_name: achievement?.name || 'Logro',
              achievement_icon: achievement?.icon || '🏆',
              achievement_rarity: achievement?.rarity || 'common',
              user_name: (ua.profiles as any)?.full_name || 'Usuario',
              user_avatar: (ua.profiles as any)?.avatar_url
            };
          })
        );
      }
    } catch (error) {
      console.error('Error fetching badge holders:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderIcon = (icon: string) => {
    if (icon?.startsWith('data:') || icon?.startsWith('http')) {
      return <img src={icon} alt="Badge" className="w-full h-full object-cover rounded-full" />;
    }
    return <span className="text-lg">{icon}</span>;
  };

  const filteredAchievements = selectedAchievement === 'all'
    ? achievements
    : achievements.filter(a => a.id === selectedAchievement);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recent Unlocks */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-primary" />
            Desbloqueos Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {recentUnlocks.length > 0 ? (
                recentUnlocks.map(unlock => (
                  <div key={unlock.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={unlock.user_avatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {unlock.user_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{unlock.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(unlock.unlocked_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                    </div>
                    <div className={cn(
                      "flex items-center gap-2 px-2 py-1 rounded-full border",
                      RARITY_COLORS[unlock.achievement_rarity as keyof typeof RARITY_COLORS]
                    )}>
                      <div className="w-5 h-5 flex items-center justify-center">
                        {renderIcon(unlock.achievement_icon)}
                      </div>
                      <span className="text-xs font-medium">{unlock.achievement_name}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay desbloqueos recientes</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Badges with Holders */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-primary" />
              Poseedores de Insignias
            </CardTitle>
            <Select value={selectedAchievement} onValueChange={setSelectedAchievement}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por insignia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las insignias</SelectItem>
                {achievements.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.holders.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {filteredAchievements.map(achievement => (
                <div key={achievement.id} className={cn(
                  "p-4 rounded-lg border-2",
                  RARITY_COLORS[achievement.rarity as keyof typeof RARITY_COLORS]
                )}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-background/50">
                      {renderIcon(achievement.icon)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{achievement.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {RARITY_LABELS[achievement.rarity as keyof typeof RARITY_LABELS]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    </div>
                    <Badge className="bg-primary/20 text-primary">
                      {achievement.holders.length} poseedores
                    </Badge>
                  </div>
                  
                  {achievement.holders.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {achievement.holders.slice(0, 10).map(holder => (
                        <div 
                          key={holder.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/50 border"
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={holder.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {holder.full_name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{holder.full_name.split(' ')[0]}</span>
                        </div>
                      ))}
                      {achievement.holders.length > 10 && (
                        <div className="flex items-center px-2 py-1 rounded-full bg-muted text-muted-foreground">
                          <span className="text-xs">+{achievement.holders.length - 10} más</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Nadie ha desbloqueado esta insignia aún
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
