import { useAchievements, RARITY_COLORS, RARITY_BORDERS } from '@/hooks/useAchievements';
import { useAuth } from '@/hooks/useAuth';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarAchievementsWidgetProps {
  collapsed?: boolean;
}

export function SidebarAchievementsWidget({ collapsed = false }: SidebarAchievementsWidgetProps) {
  const { user } = useAuth();
  const { userAchievements, loading } = useAchievements(user?.id);

  // Get 3 most recent unlocked achievements
  const recentAchievements = userAchievements.slice(0, 3);

  if (loading || recentAchievements.length === 0) {
    return null;
  }

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex justify-center py-2">
              <div className="relative">
                <Shield className="h-5 w-5 text-amber-500" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {userAchievements.length}
                </span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-card border-border">
            <p className="text-xs font-medium">{userAchievements.length} insignias</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="px-3 py-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-sidebar-foreground/70 flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-amber-500" />
          Insignias
        </span>
        <span className="text-xs text-sidebar-foreground/50">
          {userAchievements.length} total
        </span>
      </div>
      
      <div className="flex gap-1.5">
        {recentAchievements.map((ua) => {
          const achievement = ua.achievement;
          if (!achievement) return null;
          
          const rarity = achievement.rarity as keyof typeof RARITY_COLORS;
          
          return (
            <TooltipProvider key={ua.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg border-2 cursor-pointer",
                      "bg-gradient-to-br transition-transform hover:scale-110",
                      RARITY_COLORS[rarity],
                      RARITY_BORDERS[rarity]
                    )}
                  >
                    <span className="text-base drop-shadow-sm">
                      {getAchievementEmoji(achievement.icon)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-card border-border max-w-[200px]">
                  <p className="font-semibold text-xs">{achievement.name}</p>
                  <p className="text-[10px] text-muted-foreground">{achievement.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}

function getAchievementEmoji(icon: string): string {
  const emojiMap: Record<string, string> = {
    'sword': '⚔️',
    'shield': '🛡️',
    'crown': '👑',
    'trophy': '🏆',
    'star': '⭐',
    'flame': '🔥',
    'zap': '⚡',
    'target': '🎯',
    'medal': '🎖️',
    'gem': '💎',
    'rocket': '🚀',
    'heart': '❤️',
    'sparkles': '✨',
    'lightning': '⚡',
    'castle': '🏰',
    'dragon': '🐉',
    'knight': '🗡️',
  };
  return emojiMap[icon] || '🛡️';
}
